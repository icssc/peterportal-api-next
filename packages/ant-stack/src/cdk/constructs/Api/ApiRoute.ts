import path from "node:path";

import aws_apigateway from "aws-cdk-lib/aws-apigateway";
import aws_events from "aws-cdk-lib/aws-events";
import aws_events_targets from "aws-cdk-lib/aws-events-targets";
import aws_lambda from "aws-cdk-lib/aws-lambda";
import aws_core from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { defu } from "defu";
import type { BuildOptions } from "esbuild";

import { loadConfigFrom } from "../../../config.js";
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
   * Absolute file path to the project.
   *
   * @example /home/aponia/Projects/peterportal-api-next/apps/api/v1/rest/calendar
   */
  directory: string;

  /**
   * API Gateway REST API.
   */
  api: aws_apigateway.IRestApi;

  /**
   * Runtime-specific options.
   */
  runtime: ApiRouteRuntimeConfig;

  /**
   * Override construct props passed to the route's CDK constructs.
   */
  constructs: ApiRouteConstructProps;
};

/**
 * Settings that determine how the API route is built.
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
  ) => aws_apigateway.LambdaIntegrationOptions;

  functionProps?: (scope: Construct, id: string) => aws_lambda.FunctionProps;

  methodOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => aws_apigateway.MethodOptions;

  /**
   * Not an override; whether to also create a warming rule.
   */
  includeWarmers?: boolean;
}

/**
 * The resources provisioned for a single HTTP method handler.
 */
interface FunctionResources {
  functionProps: aws_lambda.FunctionProps;

  function: aws_lambda.Function;

  lambdaIntegrationOptions?: aws_apigateway.LambdaIntegrationOptions;

  lambdaIntegration?: aws_apigateway.LambdaIntegration;

  methodOptions?: aws_apigateway.MethodOptions;

  warmingTarget?: aws_events_targets.LambdaFunction;

  warmingRule?: aws_events.Rule;
}

export class ApiRoute extends Construct {
  /**
   * Override configs for this route.
   */
  overrides: ApiRouteConfigOverride[];

  /**
   * Merged config, including overrides.
   */
  config: ApiRouteConfig;

  /**
   * Path to the API route on disk.
   */
  directory: string;

  /**
   * Full path to directory for generated files.
   */
  outDirectory: string;

  /**
   * Path to main handler. Relative from {@link directory}
   */
  entryFile: string;

  /**
   * Paths to generated files. Relative from {@link outDirectory}
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

  /**
   * CDK constructs are __not__ allocated here.
   * The generated config is used in our tooling without being pre-maturely linked to AWS resources.
   */
  constructor(scope: Construct, readonly id: string, config: ApiRouteConfig) {
    super(scope, id);

    /**
     * Get all the exports from any config file in this route's directory.
     */
    const routeConfigExports = loadConfigFrom(config.directory);

    /**
     * Find exports that are child classes of {@link ApiRouteConfigOverride}, and initialize them.
     */
    this.overrides = Object.values(routeConfigExports)
      .filter(ApiRouteConfigOverride.isApiRouteConfigOverrideClass)
      .map((OverrideClass, index) => {
        /**
         * The exported class should __extend__ the original override class,
         * and then invoke its super constructor with its desired config.
         *
         * The exported child class should only require the first two arguments to initialize itself.
         */
        return new OverrideClass(this, `${id}-override-${index}`);
      });

    const overrideConfigs = this.overrides.map((override) => override.config) as [
      DeepPartial<ApiRouteConfig>
    ];

    /**
     * Each route can override default construct properties with a higher priority.
     */
    this.config = defu(...overrideConfigs, config);

    this.directory = config.directory;

    this.outDirectory = path.join(config.directory, config.runtime.esbuild?.outdir ?? "dist");

    this.entryFile = path.join(config.directory, "src", "index.js");

    this.outFiles = {
      /**
       * TODO: How to support {@link configWithDefaults.runtime.esbuild.entryPoints}?
       */
      index: "index.js",
      node: config.runtime.nodeRuntimeFile ?? "lambda-node-runtime.js",
      bun: config.runtime.bunRuntimeFile ?? "lambda-bun-runtime.js",
    };

    this.functions = {};
  }

  /**
   * Initialize CDK resources.
   */
  async synth() {
    const resource = this.config.route.split("/").reduce((resource, route) => {
      return resource.getResource(route) ?? resource.addResource(route);
    }, this.config.api.root);

    getNamedExports(this.outFiles.node)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        const functionName = `${this.id}-${httpMethod}`.replace(/\//g, "-");

        const functionProps: aws_lambda.FunctionProps = defu(
          this.config.constructs.functionProps?.(this, this.id),
          {
            functionName,
            runtime: aws_lambda.Runtime.NODEJS_18_X,
            code: aws_lambda.Code.fromAsset(this.config.directory, { exclude: ["node_modules"] }),
            handler: this.outFiles.node.replace(/.js$/, httpMethod),
            architecture: aws_lambda.Architecture.ARM_64,
            environment: { ...this.config.runtime.environment },
            timeout: aws_core.Duration.seconds(15),
            memorySize: 512,
          }
        );

        const handler = new aws_lambda.Function(
          this,
          `${this.id}-${functionProps.functionName}-handler`,
          functionProps
        );

        const methodAndRoute = `${httpMethod} ${this.config.route}`;

        const lambdaIntegrationOptions = this.config.constructs.lambdaIntegrationOptions?.(
          this,
          this.id,
          methodAndRoute
        );

        const methodOptions = this.config.constructs.methodOptions?.(this, this.id, methodAndRoute);

        const lambdaIntegration = new aws_apigateway.LambdaIntegration(
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

        if (this.config.constructs.includeWarmers) {
          const warmingTarget = new aws_events_targets.LambdaFunction(handler, {
            event: aws_events.RuleTargetInput.fromObject({ body: warmerRequestBody }),
          });

          const warmingRule = new aws_events.Rule(
            this,
            `${this.id}-${functionProps.functionName}-warming-rule`,
            {
              schedule: aws_events.Schedule.rate(aws_core.Duration.minutes(5)),
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

  /**
   * Used on initialized constructs, i.e. part of a node's children, to determine if they are of this type.
   */
  public static isApiRouteConfigOverride(x: unknown): x is ApiRouteConfigOverride {
    return Construct.isConstruct(x) && "type" in x && x["type"] === ApiRouteConfigOverride.type;
  }

  /**
   * Used on exported classes, i.e. from config files, to determine if they are of this type.
   */
  public static isApiRouteConfigOverrideClass(x: unknown): x is typeof ApiRouteConfigOverride {
    return (
      x != null &&
      typeof x === "function" &&
      "type" in x &&
      x["type"] === ApiRouteConfigOverride.type
    );
  }

  constructor(scope: Construct, id: string, public config: DeepPartial<ApiRouteConfig> = {}) {
    super(scope, id);
  }
}
