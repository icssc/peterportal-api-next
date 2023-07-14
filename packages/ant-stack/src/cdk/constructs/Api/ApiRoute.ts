import path from "node:path";

import cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { defu } from "defu";
import type { BuildOptions } from "esbuild";
import { loadConfigFrom } from "packages/ant-stack/src/config.js";

import { isHttpMethod, warmerRequestBody } from "../../../lambda-core/constants.js";
import { DeepPartial } from "../../../utils/deep-partial.js";
import { getNamedExports } from "../../../utils/static-analysis.js";

/**
 * Configure the API route.
 */
export type ApiRouteConfig = {
  /**
   * The API route.
   *
   * @example /v1/rest/calendar
   */
  route: string;

  /**
   * Location of the project, starting from the root config.
   *
   * @example apps/api/v1/rest/calendar
   */
  directory: string;

  /**
   * API Gateway REST API.
   */
  api: cdk.aws_apigateway.IRestApi;

  /**
   * Runtime-specific options.
   */
  runtime: ApiRouteRuntimeConfig;

  /**
   * Override construct props for the route.
   */
  constructs: ApiRouteConstructProps;
};

/**
 * How to generate files.
 */
export interface ApiRouteRuntimeConfig {
  /**
   * esbuild options.
   */
  esbuild?: BuildOptions;

  /**
   * What to name the imported handlers from the built entry file.
   *
   * @default InternalHandlers
   *
   * @example
   *
   * ```js
   * import * as InternalHandlers from "./dist/index.js"
   * ```
   */
  entryHandlersName?: string;

  /**
   * Name of dynamically generated script for AWS Lambda's NodeJS runtime.
   *
   * @default "lambda-node-runtime.js"
   *
   * @example
   *
   * ```js
   * import { handler } from "./lambda-node-runtime.js"
   * ```
   */
  nodeRuntimeFile?: string;

  /**
   * Name of dynamically generated script for AWS Lambda's Bun runtime.
   *
   * @default "lambda-bun-runtime.js"
   *
   * @example
   *
   * ```js
   * import { handler } from "./lambda-bun-runtime.js"
   * ```
   */
  bunRuntimeFile?: string;

  /**
   * Environment variables.
   */
  environment?: Record<string, string>;
}

/**
 * Override props provided to the constructs.
 */
export interface ApiRouteConstructProps {
  lambdaIntegrationOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => cdk.aws_apigateway.LambdaIntegrationOptions;

  functionProps?: (scope: Construct, id: string) => cdk.aws_lambda.FunctionProps;

  methodOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => cdk.aws_apigateway.MethodOptions;

  /**
   * Not an override; whether to also create a warming rule.
   */
  includeWarmers?: boolean;
}

/**
 * The resources provisioned for a single HTTP method handler.
 */
interface FunctionResources {
  functionProps: cdk.aws_lambda.FunctionProps;

  function: cdk.aws_lambda.Function;

  lambdaIntegrationOptions: cdk.aws_apigateway.LambdaIntegrationOptions;

  lambdaIntegration: cdk.aws_apigateway.LambdaIntegration;

  methodOptions: cdk.aws_apigateway.MethodOptions;

  warmingTarget?: cdk.aws_events_targets.LambdaFunction;

  warmingRule?: cdk.aws_events.Rule;
}

export class ApiRoute extends Construct {
  /**
   * Path to the API route on disk.
   */
  directory: string;

  /**
   * Needs to be defined, so extracted from {@link BuildOptions}.
   */
  outDirectory: string;

  /**
   * Needs to be defined, so extracted from {@link ApiRouteRuntimeConfig}.
   */
  outFiles: {
    index: string;
    node: string;
    bun: string;
  };

  /**
   * Methods mapped to the Lambda Functions provisioned.
   */
  functions: Record<string, FunctionResources>;

  config: ApiRouteConfig;

  constructor(scope: Construct, id: string, config: ApiRouteConfig) {
    super(scope, id);

    const configWithDefaults = defu(config);

    this.config = configWithDefaults;

    this.directory = configWithDefaults.directory;

    this.functions = {};

    this.outDirectory = path.join(
      configWithDefaults.directory,
      configWithDefaults.runtime.esbuild?.outdir ?? "dist"
    );

    this.outFiles = {
      /**
       * TODO: How to support {@link configWithDefaults.runtime.esbuild.entryPoints}?
       */
      index: path.join(this.outDirectory, "index.js"),
      node: path.join(
        this.outDirectory,
        configWithDefaults.runtime.nodeRuntimeFile ?? "lambda-node-runtime.js"
      ),
      bun: path.join(
        this.outDirectory,
        configWithDefaults.runtime.bunRuntimeFile ?? "lambda-bun-runtime.js"
      ),
    };

    const resource = configWithDefaults.route.split("/").reduce((resource, route) => {
      return resource.getResource(route) ?? resource.addResource(route);
    }, config.api.root);

    /**
     * Each route can override default construct properties with a higher priority.
     */
    const routeConfig = defu(loadConfigFrom(configWithDefaults.directory), configWithDefaults);

    getNamedExports(this.outFiles.node)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        const functionName = `${id}-${httpMethod}`.replace(/\//g, "-");

        const functionProps: cdk.aws_lambda.FunctionProps = defu(
          routeConfig.constructs.functionProps?.(this, id),
          {
            functionName,
            runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
            code: cdk.aws_lambda.Code.fromAsset(routeConfig.directory, {
              exclude: ["node_modules"],
            }),
            handler: this.outFiles.node.replace(/.js$/, httpMethod),
            architecture: cdk.aws_lambda.Architecture.ARM_64,
            environment: routeConfig.runtime.environment,
            timeout: cdk.Duration.seconds(15),
            memorySize: 512,
          }
        );

        const handler = new cdk.aws_lambda.Function(
          this,
          `${id}-${functionProps.functionName}-handler`,
          functionProps
        );

        const methodAndRoute = `${httpMethod} ${routeConfig.route}`;

        const lambdaIntegrationOptions = routeConfig.constructs.lambdaIntegrationOptions?.(
          this,
          id,
          methodAndRoute
        );

        const methodOptions = routeConfig.constructs.methodOptions?.(this, id, methodAndRoute);

        const lambdaIntegration = new cdk.aws_apigateway.LambdaIntegration(
          handler,
          lambdaIntegrationOptions
        );

        resource.addMethod(httpMethod, lambdaIntegration, methodOptions);

        this.functions[httpMethod] = {
          functionProps,
          function: handler,
          lambdaIntegration,
          lambdaIntegrationOptions,
          methodOptions,
        };

        if (routeConfig.constructs.includeWarmers) {
          const warmingTarget = new cdk.aws_events_targets.LambdaFunction(handler, {
            event: cdk.aws_events.RuleTargetInput.fromObject({ body: warmerRequestBody }),
          });

          const warmingRule = new cdk.aws_events.Rule(
            this,
            `${id}-${functionProps.functionName}-warming-rule`,
            {
              schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(5)),
            }
          );

          warmingRule.addTarget(warmingTarget);

          this.functions[httpMethod].warmingTarget = warmingTarget;
          this.functions[httpMethod].warmingRule = warmingRule;
        }
      });
  }
}

/**
 * An override class can be extended and exported from a route's config file to inject construct props.
 *
 * @example
 *
 * ```ts
 *
 * export class MyApiRouteConfigOverride extends ApiRouteConfigOverride {
 *   constructor(scope: Construct, id: string) {
 *     super(scope, id, {
 *       runtime: { ...  },
 *       constructs: { ... }
 *     })
 *   }
 * }
 *
 * ```
 *
 * {@link loadRouteConfigOverride} will find relevant exported classes and initialize them in the {@link ApiRoute} scope.
 */
export class ApiRouteConfigOverride extends Construct {
  public static readonly type = "api-route-config-override" as const;

  public readonly type = ApiRouteConfigOverride.type;

  public static isApiRouteConfigOverride(x: unknown): x is ApiRouteConfigOverride {
    return Construct.isConstruct(x) && "type" in x && x["type"] === ApiRouteConfigOverride.type;
  }

  constructor(scope: Construct, id: string, public config: DeepPartial<ApiRouteConfig>) {
    super(scope, id);
  }
}
