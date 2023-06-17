import { normalize, relative, resolve } from "node:path";

import chalk from "chalk";
import chokidar from "chokidar";
import { consola } from "consola";
import { build, type BuildOptions, context } from "esbuild";
import express, { Router } from "express";

import { type AntConfig, getConfig } from "../../config.js";
import { createExpressHandler, type InternalHandler } from "../../lambda-core/internal/handler.js";
import { findAllProjects } from "../../utils/searchProjects.js";
import { searchForPackageRoot } from "../../utils/searchRoot.js";
import { searchForWorkspaceRoot } from "../../utils/searchRoot.js";

const MethodsToExpress = {
  DELETE: "delete",
  GET: "get",
  HEAD: "head",
  PATCH: "patch",
  POST: "post",
  PUT: "put",
  OPTIONS: "options",
} as const;

const isMethod = (method: string): method is keyof typeof MethodsToExpress => {
  return method in MethodsToExpress;
};

/**
 * Start a dev server.
 */
export async function startDevServer() {
  const config = await getConfig();

  const cwd = process.cwd();

  const workspaceRoot = searchForWorkspaceRoot(cwd);

  if (cwd === workspaceRoot) {
    startRootDevServer(config);
  } else {
    startLocalDevServer(config);
  }
}

/**
 * A local Express dev server only serves the current endpoint from the root route.
 * TODO: can probably merge this logic with {@link startRootDevServer}
 */
export async function startLocalDevServer(config: Required<AntConfig>) {
  consola.info(`Starting local dev server. Only the current endpoint will be served.`);

  const file = resolve(process.cwd(), `${config.esbuild.outdir}/index.js`);

  let internalHandlers: Record<string, InternalHandler>;

  const app = express();

  let router = Router();

  config.esbuild.plugins ??= [];

  config.esbuild.plugins.push({
    name: "very-epic-and-genius-live-reload-express-strat",
    setup(build) {
      build.onStart(() =>
        consola.log(chalk.bgBlack.magenta(`Building temporary files to ${config.esbuild.outdir}`))
      );

      build.onEnd(async () => {
        /**
         * Create a new, empty router.
         */
        router = Router();

        /**
         * @link https://ar.al/2021/02/22/cache-busting-in-node.js-dynamic-esm-imports/
         * Invalidate the ESM cache by appending a dynamic string,
         * ensuring that it's re-imported and the router is refreshed with new routes.
         */
        internalHandlers = await import(`${file}?update=${Date.now()}`);

        /**
         * Populate the new router with the new handlers.
         */
        Object.keys(internalHandlers)
          .filter(isMethod)
          .forEach((key) => {
            router[MethodsToExpress[key]]("/", createExpressHandler(internalHandlers[key]));
          });

        consola.info(`🚀 Routes reloaded at http://localhost:${config.port}`);
      });
    },
  });

  /**
   * @link https://github.com/expressjs/express/issues/2596
   * Using a mutable router allows us to dynamically swap in new routers after building.
   */
  app.use((req, res, next) => router(req, res, next));

  app.listen(config.port, () => {
    consola.log(`🚀 Express server listening at http://localhost:${config.port}`);
  });

  context(config.esbuild).then((ctx) => ctx.watch());
}

/**
 * A root dev server serves all API routes from the {@link AntConfig['directory']}
 */
export async function startRootDevServer(config: Required<AntConfig>) {
  consola.info(`Starting root dev server. All endpoints from ${config.directory} will be served.`);

  const endpoints = findAllProjects(config.directory);

  //---------------------------------------------------------------------------------
  // Build step.
  //---------------------------------------------------------------------------------

  /**
   * Cache the build configs for each endpoint.
   */
  const endpointBuildConfigs = endpoints.reduce((configs, endpoint) => {
    /**
     * TODO: handle entryPoints as a {@type Record<string, string>}
     */
    const entryPoints = Array.isArray(config.esbuild.entryPoints)
      ? config.esbuild.entryPoints.map((entry) => normalize(`${endpoint}/${entry}`))
      : [normalize(`${endpoint}/${config.esbuild.entryPoints}`)];

    const outdir = normalize(`${endpoint}/${config.esbuild.outdir}`);

    configs[endpoint] = { ...config.esbuild, entryPoints, outdir };

    return configs;
  }, {} as Record<string, BuildOptions>);

  /**
   * Build all endpoints.
   */
  await Promise.all(
    endpoints.map(async (endpoint) => {
      consola.info(`🚀 Building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
      await build(endpointBuildConfigs[endpoint]);
      consola.info(`🚀 Done building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
    })
  );

  //---------------------------------------------------------------------------------
  // Express development server.
  //---------------------------------------------------------------------------------
  const app = express();

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
      consola.info(`🚀 Loading ${endpoint} from ${endpointBuildConfigs[endpoint].outdir}`);
      router.use(`/${relative(config.directory, endpoint)}`, (req, res, next) =>
        endpointMiddleware[endpoint](req, res, next)
      );
    });
  };

  /**
   * Load a specific endpoint's middleware.
   */
  const loadEndpoint = async (endpoint: string) => {
    console.log("setting up router for ", endpoint);
    endpointMiddleware[endpoint] = Router();

    const file = resolve(endpoint, `${config.esbuild.outdir}/index.js`);

    const internalHandlers = await import(`${file}?update=${Date.now()}`);

    Object.keys(internalHandlers)
      .filter(isMethod)
      .forEach((key) => {
        endpointMiddleware[endpoint][MethodsToExpress[key]](
          "/",
          createExpressHandler(internalHandlers[key])
        );
      });
  };

  /**
   * Load all endpoints.
   */
  const loadAllEndpoints = async () => await Promise.all(endpoints.map(loadEndpoint));

  /**
   * Prepare the development server by loading all the endpoints and refreshing the routes.
   */
  await loadAllEndpoints().then(refreshRouter);

  app.listen(config.port, () => {
    consola.log(`🚀 Express server listening at http://localhost:${config.port}`);
  });

  //---------------------------------------------------------------------------------
  // File watcher ...
  //---------------------------------------------------------------------------------

  const watcher = chokidar.watch(endpoints, {
    // ignore dist directory and node_modules
    ignored: /(^|[/\\])(dist|node_modules|\.git)/,
  });

  watcher.on("change", async (path) => {
    const endpoint = searchForPackageRoot(path);
    console.log("endpoint changed: ", endpoint);
    await build(endpointBuildConfigs[endpoint]);
    await loadEndpoint(endpoint).then(refreshRouter);
  });
}
