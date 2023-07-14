import fs from "node:fs";
import path from "node:path";

import { Duration } from "aws-cdk-lib";
import {
  IRestApi,
  LambdaIntegration,
  LambdaIntegrationOptions,
  MethodOptions,
} from "aws-cdk-lib/aws-apigateway";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Function, Architecture, Code, Runtime, FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { defu } from "defu";
import type { BuildOptions } from "esbuild";
import createJITI from "jiti";

import { configFiles } from "../../../config.js";
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
  api: IRestApi;

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
  esbuild: BuildOptions;

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
 * "satisfies" indicates that the object meets the requirements of the type,
 * but without explicitly typing the object as the type.
 *
 * If a property is optional in the type, but defined in this object;
 * the property in the object will be typed as fully defined.
 *
 * @link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
 */
const defaultApiRouteConfig = {
  runtime: {
    esbuild: {
      outdir: "dist",
      outfile: "index.js",
      outExtension: {
        ".js": ".mjs",
      },
    },
    entryHandlersName: "InternalHandlers",
    nodeRuntimeFile: "lambda-node-runtime.mjs",
    bunRuntimeFile: "lambda-bun-runtime.mjs",
    environment: {},
  },
  constructs: {},
} satisfies Omit<ApiRouteConfig, "route" | "directory" | "api">;

/**
 * Override props provided to the constructs.
 */
export interface ApiRouteConstructProps {
  lambdaIntegrationOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => LambdaIntegrationOptions;

  functionProps?: (scope: Construct, id: string) => FunctionProps;

  methodOptions?: (scope: Construct, id: string, methodAndRoute: string) => MethodOptions;

  /**
   * Not an override; whether to also create a warming rule.
   */
  includeWarmers?: boolean;
}

export class ApiRoute extends Construct {
  constructor(scope: Construct, id: string, public config: ApiRouteConfig) {
    super(scope, id);

    const configWithDefaults = defu(config, defaultApiRouteConfig);

    const resource = configWithDefaults.route.split("/").reduce((resource, route) => {
      return resource.getResource(route) ?? resource.addResource(route);
    }, config.api.root);

    const builtNodeHandler = path.join(
      configWithDefaults.directory,
      configWithDefaults.runtime.esbuild.outdir,
      configWithDefaults.runtime.nodeRuntimeFile
    );

    getNamedExports(builtNodeHandler)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        /**
         * Each route can override default construct properties with a higher priority.
         */
        const routeConfig = defu(loadRouteConfigOverride(config.directory), configWithDefaults);

        const functionName = `${id}-${httpMethod}`.replace(/\//g, "-");

        const functionProps: FunctionProps = defu(
          routeConfig.constructs.functionProps?.(this, id),
          {
            functionName,
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromAsset(routeConfig.directory, { exclude: ["node_modules"] }),
            handler: builtNodeHandler.replace(/.js$/, httpMethod),
            architecture: Architecture.ARM_64,
            environment: routeConfig.runtime.environment,
            timeout: Duration.seconds(15),
            memorySize: 512,
          }
        );

        const handler = new Function(
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

        const lambdaIntegration = new LambdaIntegration(handler, lambdaIntegrationOptions);

        resource.addMethod(httpMethod, lambdaIntegration, methodOptions);

        if (routeConfig.constructs.includeWarmers) {
          const warmingTarget = new LambdaFunction(handler, {
            event: RuleTargetInput.fromObject({ body: warmerRequestBody }),
          });

          const warmingRule = new Rule(this, `${id}-${functionProps.functionName}-warming-rule`, {
            schedule: Schedule.rate(Duration.minutes(5)),
          });

          warmingRule.addTarget(warmingTarget);
        }
      });
  }
}

/**
 * Executes a config file if it exists, then finds exported `ApiRouteConfigOverride` instances.
 * @returns the merged configs of overrides found.
 */
function loadRouteConfigOverride<
  T extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>
>(directory: string) {
  for (const configFile of configFiles) {
    const configPath = path.join(directory, configFile);

    if (fs.existsSync(configPath)) {
      const jiti = createJITI(path.resolve(), {
        interopDefault: true,
        cache: false,
        v8cache: false,
        esmResolve: true,
        requireCache: false,
      });

      const exports = jiti(configPath);

      const overrides = Object.values(exports).filter(
        ApiRouteConfigOverride.isApiRouteConfigOverride
      );

      const configs = overrides.map((override) => override.config) as [T];

      const mergedRouteConfig = defu(...configs);

      return mergedRouteConfig;
    }
  }

  return;
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
