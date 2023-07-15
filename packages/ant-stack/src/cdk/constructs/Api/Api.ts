import fs from "node:fs";
import path from "node:path";

import { RestApi, type RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { App, Stack } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { build } from "esbuild";

import packageJson from "../../../../package.json";
import { synthesizeConfig } from "../../../config.js";
import { isHttpMethod } from "../../../lambda-core/constants.js";
import { createBunHandler, createNodeHandler } from "../../../lambda-core/internal/handler.js";
import { findAllProjects, getWorkspaceRoot } from "../../../utils/directories.js";
import { getNamedExports } from "../../../utils/static-analysis.js";

import { ApiRoute, ApiRouteConfig } from "./ApiRoute.js";

/**
 * Configure the API Gateway REST API and set default options for API routes under it.
 */
export type ApiConfig = AnyApiConfig & CommonApiConfig & DefaultApiRouteConfig;

/**
 * API can be explicitly routed or directory-based routed.
 */
export type AnyApiConfig = DirectoryRoutedApi | ExplictlyRoutedApi;

/**
 * API routes are identified as individual projects, i.e. with a `package.json` file.
 */
export interface DirectoryRoutedApi {
  /**
   * Directory to search for API routes. API routes will be registered relative from here.
   *
   * @example apps/api
   * If a project is at apps/api/v1/rest/calendar, it will be registered as the route /v1/rest/calendar.
   */
  directory: string;
}

/**
 * Explicitly define paths to API routes.
 */
export interface ExplictlyRoutedApi {
  /**
   * @link https://docs.sst.dev/apis#add-an-api
   */
  routes: Record<string, string>;
}

/**
 * Shared settings.
 */
export interface CommonApiConfig {
  development?: ApiDevelopmentConfig;
}

export interface ApiDevelopmentConfig {
  port?: string | number;
}

/**
 * The API can set defaults for all API Routes under it.
 */
export interface DefaultApiRouteConfig extends Pick<ApiRouteConfig, "runtime" | "constructs"> {
  constructs: ApiRouteConfig["constructs"] & RootApiConstructConfig;
}

/**
 * Additional construct prop overrides are accessible only at the root.
 */
export interface RootApiConstructConfig {
  restApiProps?: (scope: Construct, id: string) => RestApiProps;
}

/**
 * Creates an API Gateway REST API with routes using Lambda integrations for specified routes.
 */
export class Api extends Construct {
  public static readonly type = "api" as const;

  public readonly type = Api.type;

  public static isApi(x: unknown): x is Api {
    return Construct.isConstruct(x) && "type" in x && x["type"] === Api.type;
  }

  /**
   * The API Gateway REST API populated with Lambda-integrated routes.
   */
  api: RestApi;

  /**
   * Maps full file paths to {@link ApiRoute}.
   */
  routes: Record<string, ApiRoute>;

  constructor(scope: Construct, id: string, readonly config: ApiConfig) {
    super(scope, id);

    this.routes = {};

    this.api = new RestApi(this, `${id}-REST-API`, config.constructs?.restApiProps?.(this, id));

    const workspaceRoot = getWorkspaceRoot(process.cwd());

    if ("directory" in config) {
      const apiDirectory = path.join(workspaceRoot, config.directory);

      /**
       * Paths to API route projects, i.e. sub-projects in the {@link apiDirectory}.
       */
      const apiRoutePaths = Array.from(new Set(findAllProjects(apiDirectory)));

      apiRoutePaths.map((apiRoutePath) => {
        const route = path.relative(apiDirectory, apiRoutePath);

        this.routes[apiRoutePath] = new ApiRoute(this, `api-route-${route}`, {
          ...config,
          route,
          directory: apiRoutePath,
          api: this.api,
        });
      });
    } else {
      /**
       * TODO: handle explitly routed API.
       */
    }
  }

  /**
   * Initializes CDK constructs.
   */
  synth() {
    Object.values(this.routes).forEach((apiRoute) => apiRoute.synth());
  }

  /**
   * Build stuff.
   */
  async build() {
    const apiRoute = await getApiRoute();

    apiRoute.config.runtime.esbuild ??= {};
    apiRoute.config.runtime.esbuild.outdir ??= apiRoute.outDirectory;

    const outFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.index);

    apiRoute.config.runtime.esbuild.entryPoints ??= {
      [outFile.replace(/.js$/, "")]: apiRoute.entryFile,
    };

    const buildOutput = await build(apiRoute.config.runtime.esbuild);

    if (apiRoute.config.runtime.esbuild?.logLevel === "info") {
      console.log(buildOutput);
    }

    await compileRuntimes(apiRoute);
  }
}

/**
 * Get the API defined in the root config.
 */
export async function getApi(initializedApp?: App) {
  const app = initializedApp ?? (await synthesizeConfig());

  const stacks = app.node.children.find(Stack.isStack);

  if (!stacks) {
    throw new Error(`No stacks found.`);
  }

  const api = stacks?.node.children.find(Api.isApi);

  if (!api) {
    throw new Error(`No API construct found.`);
  }

  return api;
}

/**
 * Get the API config with the current route at the highest priority (if it exists).
 */
export async function getApiRoute(directory: string = process.cwd()) {
  const api = await getApi();

  if (!api.routes[directory]) {
    throw new Error(`No API route found for directory: ${directory}`);
  }

  return api.routes[directory];
}

/**
 * Lambda-Core is runtime-agnostic.
 * Do some additional steps to enable compatibility for specific runtimes. e.g. AWS Lambda Node
 */
export async function compileRuntimes(apiRoute: ApiRoute) {
  const { runtime } = apiRoute.config;

  const builtEntryFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.index);
  const builtNodeFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.node);
  const builtBunFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.bun);

  const temporaryNodeFile = builtNodeFile.replace(/.js$/, ".temp.js");
  const temporaryBunFile = builtBunFile.replace(/.js$/, ".temp.js");

  /**
   * The (entry) handler's exported HTTP methods.
   */
  const httpMethods = getNamedExports(builtEntryFile).filter(isHttpMethod);

  /**
   * The runtime-specific file will import all of its handlers from the entry (handler) file.
   */
  const importHandlers = `import * as ${runtime.entryHandlersName} from '${builtEntryFile}'`;

  // All the handler's exports are re-exported, wrapped in an adapter.

  const nodeExports = httpMethods.map(
    (method) =>
      `export const ${method} = ${createNodeHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  const bunExports = httpMethods.map(
    (method) =>
      `export const ${method} = ${createBunHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  // The lines of code in the __unbundled__ temporary .js file.

  const temporaryNodeScript = [
    `import { ${createNodeHandler.name} } from '${packageJson.name}'`,
    importHandlers,
    nodeExports.join("\n"),
  ];

  const temporaryBunScript = [
    `import { ${createBunHandler.name} } from '${packageJson.name}'`,
    importHandlers,
    bunExports.join("\n"),
  ];

  // Write the temporary .js files to disk.

  fs.writeFileSync(temporaryNodeFile, temporaryNodeScript.join("\n"));
  fs.writeFileSync(temporaryBunFile, temporaryBunScript.join("\n"));

  /**
   * The temporary .js files look like this:
   *
   * ```js
   *
   *  import { createNodeHandler } from 'ant-stack'
   *  import * as handlers from './index.js'
   *  export const get = createNodeHandler(handlers.get)
   *
   * ```
   *
   * Use ESBuild to each temporary file into a standalone, runtime-specific file.
   */
  await build({
    entryPoints: {
      [builtNodeFile.replace(/\.js$/, "")]: temporaryNodeFile,
      [builtBunFile.replace(/\.js$/, "")]: temporaryBunFile,
    },
    outdir: apiRoute.outDirectory,
    platform: "node",
    format: "esm",
    bundle: true,
    target: "esnext",
    outExtension: {
      ".js": ".mjs",
    },
  });

  // Done with the temporary files, remove them.
  // The entry file is preserved as a reliable source of truth for other parts of the deployment.

  fs.unlinkSync(temporaryNodeFile);
  fs.unlinkSync(temporaryBunFile);
}
