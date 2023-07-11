import path from "node:path";
import url from "node:url";

import { Duration } from "aws-cdk-lib";
import { LambdaIntegration, RestApi, type RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Function, Architecture, Code, Runtime, FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { defu } from "defu";

import { loadConfigSync } from "../../config.js";
import { isHttpMethod, warmerRequestBody } from "../../lambda-core/constants.js";
import { findAllProjects, getWorkspaceRoot } from "../../utils/directories.js";
import { getNamedExports } from "../../utils/static-analysis.js";

export type DirectoryBasedApi = {
  /**
   * Directory to recursively find API routes.
   * API routes are identified as individual projects, i.e. with a `package.json` file.
   */
  directory: string;
};

export type ExplictlyRoutedApi = {
  /**
   * Like SST's version.
   * @link https://docs.sst.dev/apis#add-an-api
   */
  routes: Record<string, string>;
};

export type EitherApiConfig = DirectoryBasedApi | ExplictlyRoutedApi;

export type CommonApiConfig = {
  /**
   * Override default API Gateway REST API props.
   */
  restApiProps?: (scope: Construct, id: string) => RestApiProps;

  /**
   * The file with the compiled API Gateway handlers for the supported HTTP methods.
   */
  entryFile: string;

  /**
   * The name of the stack.
   */
  name: string;
};

export type ApiConfig = CommonApiConfig & EitherApiConfig;

/**
 * Creates an API Gateway REST API with routes using Lambda integrations for specified routes.
 */
export class Api extends Construct {
  api: RestApi;

  constructor(scope: Construct, id: string, readonly config: ApiConfig) {
    super(scope, id);

    this.api = new RestApi(this, `${id}-REST-API`, config.restApiProps?.(this, id));

    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

    const workspaceRoot = getWorkspaceRoot(__dirname);

    if ("directory" in config) {
      const apiDirectory = path.join(workspaceRoot, config.directory);

      Array.from(new Set(findAllProjects(apiDirectory))).forEach((fullPath) => {
        const route = path.relative(apiDirectory, fullPath);

        let resource = this.api.root;

        route.split("/").forEach((route) => {
          resource = resource.getResource(route) ?? resource.addResource(route);
        });

        getNamedExports(path.join(fullPath, config.entryFile))
          .filter(isHttpMethod)
          .forEach((httpMethod) => {
            const route = fullPath.replace(/\//g, "-");

            /**
             * Route-specific config is calculated with the current route's settings at the highest priority.
             */
            const routeConfig = loadConfigSync({ merge: true });

            const outdir = routeConfig.esbuild?.outdir ?? ".";

            const outfile = routeConfig.runtime?.nodeRuntimeFile;

            const functionProps: FunctionProps = defu(routeConfig.functionProps?.(this, id), {
              functionName: `${config.name}-${route}-${httpMethod}`,
              runtime: Runtime.NODEJS_18_X,
              code: Code.fromAsset(fullPath, {
                exclude: ["node_modules"],
              }),
              handler: path.join(outdir, outfile).replace(/.js$/, httpMethod),
              architecture: Architecture.ARM_64,
              environment: {
                ...routeConfig.env,
                STAGE: routeConfig.env?.stage,
              },
              timeout: Duration.seconds(15),
              memorySize: 512,
            });

            const handler = new Function(
              this,
              `${id}-${functionProps.functionName}-handler`,
              functionProps
            );

            const lambdaIntegration = new LambdaIntegration(handler);

            resource.addMethod(httpMethod, lambdaIntegration);

            const warmingTarget = new LambdaFunction(handler, {
              event: RuleTargetInput.fromObject({ body: warmerRequestBody }),
            });

            const warmingRule = new Rule(this, `${id}-${functionProps.functionName}-warming-rule`, {
              schedule: Schedule.rate(Duration.minutes(5)),
            });

            warmingRule.addTarget(warmingTarget);
          });
      });
    } else {
      /**
       * TODO: handle explitly routed API.
       */
    }
  }
}
