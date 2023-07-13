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
   */
  route: string;

  /**
   * Location of the project.
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
   * Override construct options for the route.
   */
  constructs: ApiRouteConstructProps;
};

/**
 * Options that control dynamically generated files for different runtimes.
 */
export interface ApiRouteRuntimeConfig {
  /**
   * The name of the built file with all the handlers for the route.
   *
   * @default dist/index.js
   */
  entryFile?: string;

  /**
   * Esbuild options.
   */
  esbuild: BuildOptions;

  /**
   * What to name the imported handlers from the built entry file.
   *
   * @default InternalHandlers
   *
   * @example {@link entryFile} = dist/index.js
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

const defaultApiRouteConfig = {
  runtime: {
    esbuild: {
      outdir: "dist",
      outfile: "lambda-node-runtime.mjs",
      outExtension: {
        ".js": ".mjs",
      },
    },
    entryFile: "dist/index.mjs",
    entryHandlersName: "InternalHandlers",
    nodeRuntimeFile: "lambda-node-runtime.mjs",
    bunRuntimeFile: "lambda-bun-runtime.mjs",
  },
  constructs: {},
} satisfies Omit<ApiRouteConfig, "route" | "directory" | "api">;

/**
 * Override the properties provided to the constructs.
 */
export interface ApiRouteConstructProps {
  /**
   * Override default Lambda integration props for each function.
   */
  lambdaIntegrationOptions?: (
    scope: Construct,
    id: string,
    methodAndRoute: string
  ) => LambdaIntegrationOptions;

  /**
   * Override default function props for each route.
   */
  functionProps?: (scope: Construct, id: string) => FunctionProps;

  /**
   * Override default method options for each route.
   */
  methodOptions?: (scope: Construct, id: string, methodAndRoute: string) => MethodOptions;

  /**
   * Whether to generate a warming rule for all routes.
   */
  includeWarmers?: boolean;
}

export class ApiRoute extends Construct {
  constructor(scope: Construct, id: string, public config: ApiRouteConfig) {
    super(scope, id);

    const configWithDefaults = defu(config, defaultApiRouteConfig);

    let resource = configWithDefaults.api.root;

    configWithDefaults.route.split("/").forEach((route) => {
      resource = resource.getResource(route) ?? resource.addResource(route);
    });

    const builtFile = path.join(
      configWithDefaults.directory,
      configWithDefaults.runtime.esbuild.outdir,
      configWithDefaults.runtime.nodeRuntimeFile
    );

    getNamedExports(builtFile)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        /**
         * Each route can override default construct properties with a higher priority.
         */
        const routeConfig = defu(loadRouteConfig(config.directory), configWithDefaults);

        const functionName = `${id}-${httpMethod}`.replace(/\//g, "-");

        const functionProps: FunctionProps = defu(
          routeConfig.constructs.functionProps?.(this, id),
          {
            functionName,
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromAsset(routeConfig.directory, { exclude: ["node_modules"] }),
            handler: builtFile.replace(/.js$/, httpMethod),
            architecture: Architecture.ARM_64,
            environment: { ...routeConfig.runtime.environment },
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

function loadRouteConfig(directory: string) {
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

      const configs = overrides.map((override) => override.config);

      const mergedRouteConfig = defu(...(configs as [DeepPartial<ApiRouteConfig>]));

      return mergedRouteConfig;
    }
  }

  return;
}

/**
 * This can be declared at any route project to override the default API route config.
 */
export class ApiRouteConfigOverride extends Construct {
  public static readonly type = "api-route-config-override" as const;

  public static isApiRouteConfigOverride(x: unknown): x is ApiRouteConfigOverride {
    return Construct.isConstruct(x) && "type" in x && x["type"] === ApiRouteConfigOverride.type;
  }

  constructor(scope: Construct, id: string, public config: DeepPartial<ApiRouteConfig>) {
    super(scope, id);
  }
}
