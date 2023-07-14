import path from "node:path";

import { Stack } from "aws-cdk-lib";
import { RestApi, type RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

import { synthesizeConfig } from "../../../config.js";
import { findAllProjects, getWorkspaceRoot } from "../../../utils/directories.js";

import { ApiRoute, ApiRouteConfig } from "./ApiRoute.js";

/**
 * Configure the API Gateway REST API and set default options for API routes under it.
 */
export type ApiConfig = AnyApiConfig & DefaultApiRouteConfig;

/**
 * API can be explicitly routed or directory-based routed.
 */
export type AnyApiConfig = DirectoryRoutedApi | ExplictlyRoutedApi;

/**
 * API routes are identified as individual projects, i.e. with a `package.json` file.
 */
export type DirectoryRoutedApi = {
  /**
   * Directory to search for API routes. API routes will be registered relative from this.
   */
  directory: string;
};

/**
 * Explicitly define paths to API routes.
 */
export type ExplictlyRoutedApi = {
  /**
   * @link https://docs.sst.dev/apis#add-an-api
   */
  routes: Record<string, string>;
};

/**
 * The root API Gateway construct can set defaults for all API Routes under it.
 */
export interface DefaultApiRouteConfig extends Pick<ApiRouteConfig, "runtime" | "constructs"> {
  constructs: ApiRouteConfig["constructs"] & RootApiConstructConfig;
}

/**
 * Additional construct option overrides are accessible only at the root.
 */
export interface RootApiConstructConfig {
  /**
   * Override {@link RestApiProps} passed to {@link RestApi}.
   */
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
}

export async function synthesizeApi() {
  const app = await synthesizeConfig();

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
  const api = await synthesizeApi();

  if (!api.routes[directory]) {
    throw new Error(`No API route found for directory: ${directory}`);
  }

  return api.routes[directory];
}
