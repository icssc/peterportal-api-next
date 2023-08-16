import { basename, join, relative, resolve } from "node:path";

import bodyParser from "body-parser";
import chokidar from "chokidar";
import { consola } from "consola";
import cors from "cors";
import { build, type BuildOptions } from "esbuild";
import express from "express";
import { RequestHandler, Router } from "express";

import { getConfig } from "../../config";
import { createExpressHandler, createErrorResult, logger, zeroUUID } from "../../lambda-core";
import {
  findAllProjects,
  getClosestProjectDirectory,
  isMethod,
  isStringArray,
  MethodsToExpress,
  searchForWorkspaceRoot,
} from "../../utils";

const notFoundHandler: RequestHandler = (req, res) => {
  logger.info(
    `${req.method} ${req.path} ${JSON.stringify(req.method === "GET" ? req.query : req.body)}`,
  );
  const { statusCode, body, headers } = createErrorResult(
    404,
    "The requested resource could not be found.",
    zeroUUID,
  );
  res.status(statusCode).set(headers).json(JSON.parse(body));
};

/**
 * Start a dev server.
 */
export async function startDevServer() {
  const config = await getConfig();

  const cwd = process.cwd();

  const workspaceRoot = searchForWorkspaceRoot(cwd);

  if (cwd === workspaceRoot || basename(cwd) === "ant-stack") {
    consola.info(
      `🎏 Starting root dev server. All endpoints from ${config.directory} will be served.`,
    );
    config.directory = join(workspaceRoot, config.directory);
  } else {
    const endpoint = relative(`${workspaceRoot}/${config.directory}`, cwd);
    consola.info(
      `🎏 Starting local dev server. Only the current endpoint, ${endpoint} will be served at the "/" route.`,
    );
    config.directory = resolve(process.cwd());
  }

  const endpoints = findAllProjects(config.directory);

  //---------------------------------------------------------------------------------
  // Build.
  //---------------------------------------------------------------------------------

  /**
   * Cache the build configs for each endpoint.
   */
  const endpointBuildConfigs = endpoints.reduce(
    (configs, endpoint) => {
      /**
       * {@link BuildOptions.entryPoints} can be way too many different things !!
       */
      const entryPoints = Array.isArray(config.esbuild.entryPoints)
        ? isStringArray(config.esbuild.entryPoints)
          ? config.esbuild.entryPoints.map((entry) => `${endpoint}/${entry}`)
          : config.esbuild.entryPoints.map((entry) => ({
              in: `${endpoint}/${entry.in}`,
              out: `${endpoint}/${entry.out}`,
            }))
        : typeof config.esbuild.entryPoints === "object"
        ? Object.entries(config.esbuild.entryPoints).map(([key, value]) => ({
            in: `${endpoint}/${key}`,
            out: `${endpoint}/${value}`,
          }))
        : config.esbuild.entryPoints;

      const outdir = resolve(`${endpoint}/${config.esbuild.outdir}`);

      configs[endpoint] = { ...config.esbuild, entryPoints, outdir };

      return configs;
    },
    {} as Record<string, BuildOptions>,
  );

  /**
   * Build all endpoints.
   */
  await Promise.all(
    endpoints.map(async (endpoint) => {
      consola.info(`🔨 Building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
      await build(endpointBuildConfigs[endpoint]);
      consola.info(`✅ Done building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
    }),
  );

  //---------------------------------------------------------------------------------
  // Express development server.
  //---------------------------------------------------------------------------------

  const app = express();

  app.use(cors(), bodyParser.json());

  /**
   * Mutable global router can be hot-swapped when routes change.
   * app.use ( global router .use (endpoint router ) )
   * To update the routes, re-assign the global router, and load all endpoint routes into the new router.
   */
  let router = Router();

  app.use((req, res, next) => router(req, res, next));

  /**
   * Express will assign middleware based on endpoints.
   */
  const endpointMiddleware: Record<string, Router> = {};

  /**
   * Replace the global router with a fresh one and reload all endpoints.
   */
  const refreshRouter = () => {
    router = Router();

    endpoints.forEach((endpoint) => {
      const api = `/${relative(config.directory, endpoint)}`;

      consola.info(`🔄 Loading ${api} from ${endpointBuildConfigs[endpoint].outdir}`);

      router.use(api, (req, res, next) => endpointMiddleware[endpoint](req, res, next));
    });

    router.all("*", notFoundHandler);
  };

  /**
   * Load a specific endpoint's middleware.
   */
  const loadEndpoint = async (endpoint: string) => {
    consola.info(`🔧 Setting up router for ${endpoint}`);

    endpointMiddleware[endpoint] = Router();

    const file = resolve(endpoint, `${config.esbuild.outdir}/index.js`);

    const internalHandlers = await import(`${file}?update=${Date.now()}`);

    const handlerFunctions = internalHandlers.default ?? internalHandlers;

    const handlerMethods = Object.keys(handlerFunctions);

    handlerMethods.filter(isMethod).forEach((key) => {
      endpointMiddleware[endpoint][MethodsToExpress[key]](
        "/",
        createExpressHandler(handlerFunctions[key]),
      );
    });

    handlerMethods.filter(isMethod).forEach((key) => {
      endpointMiddleware[endpoint][MethodsToExpress[key]](
        "/:id",
        createExpressHandler(handlerFunctions[key]),
      );
    });
  };

  /**
   * Prepare the development server by loading all the endpoints and refreshing the routes.
   */
  await Promise.all(endpoints.map(loadEndpoint)).then(refreshRouter);

  const port = process.env.API_PORT ?? config.port;

  app.listen(port, () => {
    consola.info(`🎉 Express server listening at http://localhost:${port}`);
  });

  //---------------------------------------------------------------------------------
  // Watch file changes.
  //---------------------------------------------------------------------------------

  const watcher = chokidar.watch(endpoints, {
    ignored: [
      /(^|[/\\])\../, // dotfiles
      /node_modules/, // node_modules
      `**/${config.esbuild.outdir ?? "dist"}/**`, // build output directory
    ],
  });

  watcher.on("change", async (path) => {
    const endpoint = getClosestProjectDirectory(path);

    consola.success("✨ endpoint changed: ", endpoint);

    await build(endpointBuildConfigs[endpoint]);
    await loadEndpoint(endpoint).then(refreshRouter);
  });
}
