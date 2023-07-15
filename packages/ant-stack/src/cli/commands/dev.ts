import { relative, resolve } from "node:path";

import bodyParser from "body-parser";
import chokidar from "chokidar";
import { consola } from "consola";
import cors from "cors";
import { build, type BuildOptions } from "esbuild";
import express, { Router } from "express";

import { getApi } from "../../cdk/constructs/Api/Api.js";
import { createExpressHandler } from "../../lambda-core/internal/handler.js";
import { getClosestProjectDirectory, getWorkspaceRoot } from "../../utils/directories.js";

/**
 * Translates the HTTP verbs exported by the lambda-core into Express methods.
 */
const MethodsToExpress = {
  DELETE: "delete",
  GET: "get",
  HEAD: "head",
  PATCH: "patch",
  POST: "post",
  PUT: "put",
  OPTIONS: "options",
  ANY: "use",
} as const;

/**
 * TODO: move to some location for "express-adapter" related stuff?
 */
function isMethod(method: string): method is keyof typeof MethodsToExpress {
  return method in MethodsToExpress;
}

/**
 * TODO: move to utils.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Start a dev server.
 */
export async function startDevServer() {
  const api = await getApi();

  if (!("directory" in api.config)) {
    throw new Error(`TODO: explicitly routed API is not supported yet.`);
  }

  const config = api.config;

  const cwd = process.cwd();

  const workspaceRoot = getWorkspaceRoot(cwd);

  if (cwd === workspaceRoot) {
    consola.info(
      `🎏 Starting root dev server. All endpoints from ${api.config.directory} will be served.`
    );
  } else {
    const endpoint = relative(`${workspaceRoot}/${config.directory}`, cwd);
    consola.info(
      `🎏 Starting local dev server. Only the current endpoint, ${endpoint} will be served at the "/" route.`
    );
    config.directory = resolve(process.cwd());
  }

  const endpoints = Object.keys(api.routes);

  //---------------------------------------------------------------------------------
  // Build.
  //---------------------------------------------------------------------------------

  /**
   * Cache the build configs for each endpoint.
   */
  const endpointBuildConfigs = endpoints.reduce((configs, endpoint) => {
    /**
     * {@link BuildOptions.entryPoints} can be way too many different things !!
     */
    const entryPoints = Array.isArray(config.runtime.esbuild?.entryPoints)
      ? isStringArray(config.runtime.esbuild?.entryPoints)
        ? config.runtime.esbuild?.entryPoints.map((entry) => `${endpoint}/${entry}`)
        : config.runtime.esbuild?.entryPoints.map((entry) => ({
            in: `${endpoint}/${entry.in}`,
            out: `${endpoint}/${entry.out}`,
          }))
      : typeof config.runtime.esbuild?.entryPoints === "object"
      ? Object.entries(config.runtime?.esbuild.entryPoints).map(([key, value]) => ({
          in: `${endpoint}/${key}`,
          out: `${endpoint}/${value}`,
        }))
      : config.runtime.esbuild?.entryPoints;

    const outdir = resolve(`${endpoint}/${config.runtime.esbuild?.outdir}`);

    configs[endpoint] = { ...api.routes[endpoint].config.runtime.esbuild, entryPoints, outdir };

    return configs;
  }, {} as Record<string, BuildOptions>);

  /**
   * Build all endpoints.
   */
  await Promise.all(
    endpoints.map(async (endpoint) => {
      consola.info(`🔨 Building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
      await build(endpointBuildConfigs[endpoint]);
      consola.info(`✅ Done building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
    })
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
  };

  /**
   * Load a specific endpoint's middleware.
   */
  const loadEndpoint = async (endpoint: string) => {
    consola.info(`⚙  Setting up router for ${endpoint}`);

    endpointMiddleware[endpoint] = Router();

    const file = resolve(endpoint, `${config.runtime.esbuild?.outdir}/index.js`);

    const internalHandlers = await import(`${file}?update=${Date.now()}`);

    const handlerFunctions = internalHandlers.default ?? internalHandlers;

    const handlerMethods = Object.keys(handlerFunctions);

    handlerMethods.filter(isMethod).forEach((key) => {
      endpointMiddleware[endpoint][MethodsToExpress[key]](
        "/",
        createExpressHandler(handlerFunctions[key])
      );
    });
  };

  /**
   * Prepare the development server by loading all the endpoints and refreshing the routes.
   */
  await Promise.all(endpoints.map(loadEndpoint)).then(refreshRouter);

  app.listen(8080, () => {
    consola.info(`🎉 Express server listening at http://localhost:${8080}`);
  });

  //---------------------------------------------------------------------------------
  // Watch file changes.
  //---------------------------------------------------------------------------------

  const watcher = chokidar.watch(endpoints, {
    ignored: [
      /(^|[/\\])\../, // dotfiles
      /node_modules/, // node_modules
      `**/${config.runtime.esbuild?.outdir ?? "dist"}/**`, // build output directory
    ],
  });

  watcher.on("change", async (path) => {
    const endpoint = getClosestProjectDirectory(path);

    consola.success("✨ endpoint changed: ", endpoint);

    await build(endpointBuildConfigs[endpoint]);
    await loadEndpoint(endpoint).then(refreshRouter);
  });
}
