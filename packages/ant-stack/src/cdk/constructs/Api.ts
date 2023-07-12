import path from "node:path";
import url from "node:url";

import { Duration } from "aws-cdk-lib";
import {
  LambdaIntegration,
  LambdaIntegrationOptions,
  MethodOptions,
  RestApi,
  type RestApiProps,
} from "aws-cdk-lib/aws-apigateway";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Function, Architecture, Code, Runtime, FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { defu } from "defu";
import type { BuildOptions } from "esbuild";

import { loadConfig } from "../../config.js";
import { isHttpMethod, warmerRequestBody } from "../../lambda-core/constants.js";
import { findAllProjects, getWorkspaceRoot } from "../../utils/directories.js";
import { getNamedExports } from "../../utils/static-analysis.js";

export type ApiConfig = AnyApiConfig & {
  /**
   * Identifier.
   */
  type: "api";

  /**
   * Runtime-specific options. Affects the development and build processes.
   */
  runtime: ApiRuntime;

  /**
   * Override construct options for all routes.
   */
  constructs: ApiConstructOverrides;
};

/**
 * API can be explicitly routed or with directory-based routed.
 */
export type AnyApiConfig = DirectoryBasedApi | ExplictlyRoutedApi;

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

/**
 * Options that control dynamically generated files for different runtimes.
 */
export interface ApiRuntime {
  /**
   * The name of the built file with all the handlers for the route.
   * @example dist/index.js
   */
  entryFile: string;

  /**
   * Esbuild options.
   */
  esbuild: BuildOptions;

  /**
   * What to name the imported handlers from the built entry file.
   *
   * @example entryHandlersName = InternalHandlers
   * import * as InternalHandlers from './<entryFile>'
   */
  entryHandlersName: string;

  /**
   * Name of lambda-core file. Contains all the necessary runtime code/helpers.
   * @example lambdaCoreFile = 'lambda-core.js'
   * import { createNodeHandler } from './lambda-core.js'
   */
  lambdaCoreFile: string;

  /**
   * Name of dynamically generated script for AWS Lambda's NodeJS runtime.
   * @example 'lambda-node-runtime.js'
   */
  nodeRuntimeFile: string;

  /**
   * Name of dynamically generated script for AWS Lambda's Bun runtime.
   * @example 'lambda-bun-runtime.js'
   */
  bunRuntimeFile: string;
}

export interface ApiConstructOverrides {
  /**
   * Override default API Gateway REST API props.
   */
  restApiOptions?: (scope: Construct, id: string) => RestApiProps;

  /**
   * Override default Lambda integration props for each function.
   */
  lambdaIntegrationOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => LambdaIntegrationOptions;

  /**
   * Override default method options for each route.
   */
  methodOptions?: (scope: Construct, id: string, methodAndRoute: string) => MethodOptions;

  /**
   * Whether to generate a warming rule for all routes.
   */
  includeWarmers?: boolean;
}

/**
 * Creates an API Gateway REST API with routes using Lambda integrations for specified routes.
 */
export class Api extends Construct {
  type = "api" as const;

  /**
   * The API Gateway REST API populated with Lambda-integrated routes.
   */
  api: RestApi;

  /**
   * Maps full file paths to the relative API routes.
   */
  routes: Record<string, string>;

  constructor(scope: Construct, id: string, readonly config: ApiConfig) {
    super(scope, id);

    this.routes = {};

    this.api = new RestApi(this, `${id}-REST-API`, config.constructs?.restApiOptions?.(this, id));

    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

    const workspaceRoot = getWorkspaceRoot(__dirname);

    if ("directory" in config) {
      const apiDirectory = path.join(workspaceRoot, config.directory);

      Array.from(new Set(findAllProjects(apiDirectory))).forEach((fullPath) => {
        const route = path.relative(apiDirectory, fullPath);

        this.routes[fullPath] = route;

        let resource = this.api.root;

        route.split("/").forEach((route) => {
          resource = resource.getResource(route) ?? resource.addResource(route);
        });

        getNamedExports(path.join(fullPath, config.runtime?.entryFile ?? "dist/index.js"))
          .filter(isHttpMethod)
          .forEach((httpMethod) => {
            const routeName = fullPath.replace(/\//g, "-");

            /**
             * Route-specific config is calculated with the current route's settings at the highest priority.
             */
            const routeConfig = loadConfig({ merge: true });

            const outdir = routeConfig.api?.runtime?.esbuild?.outdir ?? ".";

            const outfile = routeConfig.api?.runtime?.nodeRuntimeFile;

            const functionProps: FunctionProps = defu(routeConfig.functionProps?.(this, id), {
              functionName: `${id}-${routeName}-${httpMethod}`,
              runtime: Runtime.NODEJS_18_X,
              code: Code.fromAsset(fullPath, { exclude: ["node_modules"] }),
              handler: path.join(outdir, outfile ?? "index.js").replace(/.js$/, httpMethod),
              architecture: Architecture.ARM_64,
              environment: { ...routeConfig.env },
              timeout: Duration.seconds(15),
              memorySize: 512,
            });

            const handler = new Function(
              this,
              `${id}-${functionProps.functionName}-handler`,
              functionProps
            );

            const methodAndRoute = `${httpMethod} ${route}`;

            const lambdaIntegrationOptions = config.lambdaIntegrationOptions?.(
              this,
              id,
              methodAndRoute
            );

            const methodOptions = config.methodOptions?.(this, id, methodAndRoute);

            const lambdaIntegration = new LambdaIntegration(handler, lambdaIntegrationOptions);

            resource.addMethod(httpMethod, lambdaIntegration, methodOptions);

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
