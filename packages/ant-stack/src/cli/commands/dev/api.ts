import path from "node:path";

import bodyParser from "body-parser";
import chokidar from "chokidar";
import { consola } from "consola";
import cors from "cors";
import { build } from "esbuild";
import express, { Router } from "express";

import type { Api, ApiRoute } from "../../../cdk/constructs/Api";
import { type InternalHandler } from "../../../lambda-core/internal/handler.js";
import { createExpressHandler } from "../../../lambda-core/internal/handler.js";
import { getWorkspaceRoot, getClosestProjectDirectory } from "../../../utils/directories.js";
import { isMethod, MethodsToExpress, type Method } from "../../../utils/express-apigateway";

/**
 * Start an ExpressJS server for the API construct.
 */
export async function startApiDevelopmentServer(api: Api) {
  if (!("directory" in api.config)) {
    throw new Error(`TODO: explicitly routed API is not supported yet.`);
  }

  const cwd = process.cwd();

  const workspaceRoot = getWorkspaceRoot(cwd);

  if (cwd === workspaceRoot) {
    consola.info(
      `🎏 Starting root dev server. All endpoints from ${api.config.directory} will be served.`
    );
  } else {
    const endpoint = path.relative(`${workspaceRoot}/${api.config.directory}`, cwd);
    consola.info(
      `🎏 Starting local dev server. Only the current endpoint, ${endpoint} will be served at the "/" route.`
    );
    api.config.directory = path.resolve(process.cwd());
  }

  const apiRoutePaths = Object.keys(api.routes);

  const apiRoutes = Object.values(api.routes);

  //---------------------------------------------------------------------------------
  // Build.
  //---------------------------------------------------------------------------------

  /**
   * Build all endpoints.
   */
  await Promise.all(
    apiRoutes.map(async (apiRoute) => {
      consola.info(`🔨 Building ${apiRoute.directory} to ${apiRoute.outDirectory}`);

      apiRoute.config.runtime.esbuild ??= {};
      apiRoute.config.runtime.esbuild.outdir ??= apiRoute.outDirectory;

      const outFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.index);

      apiRoute.config.runtime.esbuild.entryPoints ??= {
        [outFile.replace(/.js$/, "")]: apiRoute.entryFile,
      };

      await build(apiRoute.config.runtime.esbuild);

      consola.info(`✅ Done building ${apiRoute.directory} to ${apiRoute.outDirectory}`);
    })
  );

  //---------------------------------------------------------------------------------
  // Express development server.
  //---------------------------------------------------------------------------------

  const app = express();

  app.use(cors(), bodyParser.json());

  /**
   * Mutable global router can be hot-swapped when routes change.
   * To update the routes, re-assign the global router, and load all endpoint routes into the new router.
   */
  let router = Router();

  app.use((req, res, next) => router(req, res, next));

  /**
   * Routes mapped to ExpressJS routers, i.e. middleware.
   */
  const routers: Record<string, Router> = {};

  /**
   * Replace the global router with a fresh one and reload all endpoints.
   */
  const refreshRouter = () => {
    router = Router();
    apiRoutes.forEach((apiRoute) => {
      consola.info(`🔄 Loading /${apiRoute.config.route} from ${apiRoute.outDirectory}`);
      router.use(`/${apiRoute.config.route}`, (...args) => routers[apiRoute.directory](...args));
    });
  };

  /**
   * Load a specific endpoint's middleware.
   */
  const loadEndpoint = async (apiRoute: ApiRoute) => {
    consola.info(`⚙  Setting up router for ${apiRoute}`);

    routers[apiRoute.directory] = Router();

    const file = path.resolve(apiRoute.directory, apiRoute.outDirectory, apiRoute.outFiles.index);

    const internalHandlers = await import(`${file}?update=${Date.now()}`);

    if (internalHandlers == null) {
      consola.error(`🚨 Failed to load ${apiRoute.directory}. No exports found.`);
      return;
    }

    const handlerFunctions = internalHandlers.default ?? internalHandlers;

    Object.entries(handlerFunctions)
      .filter((entry): entry is [Method, InternalHandler] => isMethod(entry[0]))
      .map(([key, handler]) => [MethodsToExpress[key], handler] as const)
      .forEach(([method, handler]) => {
        routers[apiRoute.directory][method]("/", createExpressHandler(handler));
      });
  };

  /**
   * Prepare the development server by loading all the endpoints and refreshing the routes.
   */
  await Promise.all(apiRoutes.map(loadEndpoint)).then(refreshRouter);

  const port = api.config.development?.port ?? 8080;

  app.listen(port, () => {
    consola.info(`🎉 Express server listening at http://localhost:${port}`);
  });

  const outputDirectories = apiRoutes.map((apiRoute) =>
    path.resolve(workspaceRoot, apiRoute.directory, apiRoute.outDirectory)
  );

  //---------------------------------------------------------------------------------
  // Watch file changes.
  //---------------------------------------------------------------------------------

  const watcher = chokidar.watch(apiRoutePaths, {
    ignored: [
      /(^|[/\\])\../, // dotfiles
      /node_modules/, // node_modules
      ...outputDirectories,
    ],
  });

  watcher.on("change", async (path) => {
    const endpoint = getClosestProjectDirectory(path);

    consola.success("✨ endpoint changed: ", endpoint);

    await build(api.routes[endpoint].config.runtime.esbuild ?? {});

    await loadEndpoint(api.routes[endpoint]).then(refreshRouter);
  });
}
