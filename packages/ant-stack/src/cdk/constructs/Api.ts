import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { RestApi, type RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

import { findAllProjects, getWorkspaceRoot } from "../../utils/directories.js";

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
   * The API Gateway REST API props.
   */
  restApiProps?: RestApiProps;
};

export type ApiConfig = CommonApiConfig & EitherApiConfig;

/**
 * Creates an API Gateway REST API with routes using Lambda integrations for specified routes.
 */
export class Api extends Construct {
  api: RestApi;

  constructor(scope: Construct, id: string, readonly config: ApiConfig) {
    super(scope, id);

    this.api = new RestApi(this, "Ant-Stack Rest API", config.restApiProps);

    const __dirname = fileURLToPath(new URL(".", import.meta.url));

    const workspaceRoot = getWorkspaceRoot(__dirname);

    if ("directory" in config) {
      const apiDirectory = join(workspaceRoot, config.directory);

      findAllProjects(apiDirectory).forEach((fullPath) => {
        const route = relative(apiDirectory, fullPath);

        let resource = this.api.root;

        route.split("/").forEach((route) => {
          resource = resource.getResource(route) ?? resource.addResource(route);
        });

        const internalHandlers: Record<string, InternalHandler> = await import(
          join(fullPath, "dist", "index.js")
        );
      });
    } else {
      /**
       * TODO: handle explitly routed API.
       */
    }
  }
}
