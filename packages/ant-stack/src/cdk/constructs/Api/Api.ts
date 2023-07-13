import path from "node:path";
import url from "node:url";

import { Stack } from "aws-cdk-lib";
import { RestApi, type RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

import { initConfig } from "../../../config.js";
import { findAllProjects, getWorkspaceRoot } from "../../../utils/directories.js";

import { ApiRoute, ApiRouteConfig } from "./ApiRoute.js";

export type ApiConfig = AnyApiConfig & DefaultApiRouteConfig;

/**
 * API can be explicitly routed or directory-based routed.
 */
export type AnyApiConfig = DirectoryRoutedApi | ExplictlyRoutedApi;

export type DirectoryRoutedApi = {
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
 * The root API Gateway construct can set defaults for all API Routes under it.
 */
export interface DefaultApiRouteConfig extends Pick<ApiRouteConfig, "runtime" | "constructs"> {
  constructs: ApiRouteConfig["constructs"] & RootApiConstructConfig;
}

/**
 * Additional constructs are accessible only at the root.
 */
export interface RootApiConstructConfig {
  /**
   * Override default API Gateway REST API props.
   */
  restApiOptions?: (scope: Construct, id: string) => RestApiProps;
}

/**
 * Creates an API Gateway REST API with routes using Lambda integrations for specified routes.
 */
export class Api extends Construct {
  public static readonly type = "api-route-config-override" as const;

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

    this.api = new RestApi(this, `${id}-REST-API`, config.constructs?.restApiOptions?.(this, id));

    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

    const workspaceRoot = getWorkspaceRoot(__dirname);

    if ("directory" in config) {
      const apiDirectory = path.join(workspaceRoot, config.directory);

      /**
       * Paths to API route projects, i.e. sub-projects in the {@link apiDirectory}.
       */
      const apiRoutePaths = Array.from(new Set(findAllProjects(apiDirectory)));

      apiRoutePaths.map((apiRoutePath) => {
        const route = path.relative(apiDirectory, apiRoutePath);

        const apiRoute = new ApiRoute(this, `api-route-${route}`, {
          ...config,
          route,
          directory: apiRoutePath,
          api: this.api,
        });

        this.routes[apiRoutePath] = apiRoute;
      });
    } else {
      /**
       * TODO: handle explitly routed API.
       */
    }
  }
}

export async function initApi() {
  const app = await initConfig();

  if (!app) {
    throw new Error(`No config file found.`);
  }

  const stacks = app.node.children.find(Stack.isStack);

  const api = stacks?.node.children.find(Api.isApi);

  if (!api) {
    throw new Error(`No API construct found.`);
  }

  return api;
}
