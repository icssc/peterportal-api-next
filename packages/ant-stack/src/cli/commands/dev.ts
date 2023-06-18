import { normalize, relative, resolve } from "node:path";
import chokidar from "chokidar";
import { consola } from "consola";
import express, { Router } from "express";
import { build, type BuildOptions } from "esbuild";
import { type AntConfig, getConfig } from "../../config.js";
import { findAllProjects } from "../../utils/searchProjects.js";
import { searchForPackageRoot } from "../../utils/searchRoot.js";
import { searchForWorkspaceRoot } from "../../utils/searchRoot.js";
import { createExpressHandler } from "../../lambda-core/internal/handler.js";

const MethodsToExpress = {
  DELETE: "delete",
  GET: "get",
  HEAD: "head",
  PATCH: "patch",
  POST: "post",
  PUT: "put",
  OPTIONS: "options",
} as const;

function isMethod(method: string): method is keyof typeof MethodsToExpress {
  return method in MethodsToExpress;
}

function isStringArray(value: Array<unknown>): value is string[] {
  return value.every((v) => typeof v === "string");
}

/**
 * Dynamically import an entry point file with handlers, and create a new {@link Router} with them.
 */
async function loadEndpoint(endpoint: string, config: Required<AntConfig>) {
  consola.info(`⚙  Setting up router for ${endpoint}`);

  const endpointRouter = Router();

  const file = resolve(endpoint, `${config.esbuild.outdir}/index.js`);

  /**
   * @link https://ar.al/2021/02/22/cache-busting-in-node.js-dynamic-esm-imports/
   * Invalidate the ESM cache by appending a random string, that ensures the module is re-imported.
   */
  const internalHandlers = await import(`${file}?update=${Date.now()}`);

  const handlerMethods = internalHandlers.default
    ? Object.keys(internalHandlers.default)
    : Object.keys(internalHandlers);

  const handlerFunctions = internalHandlers.default ? internalHandlers.default : internalHandlers;

  /**
   * Populate the router with the exported handler functions converted to Express handlers.
   */
  handlerMethods.filter(isMethod).forEach((key) => {
    endpointRouter[MethodsToExpress[key]]("/", createExpressHandler(handlerFunctions[key]));
  });

  return endpointRouter;
}

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
 * Useful for quickly testing endpoints individually.
 */
export async function startLocalDevServer(config: Required<AntConfig>) {
  consola.info(`🎏 Starting local dev server. Only the current endpoint will be served.`);

  const cwd = process.cwd();

  const app = express();

  await build(config.esbuild);

  /**
   * @link https://github.com/expressjs/express/issues/2596
   * Re-assigning a new router effectively refreshes all the routes.
   */
  let router = await loadEndpoint(cwd, config);

  app.use((req, res, next) => router(req, res, next));

  app.listen(config.port, () => {
    consola.log(`🚀 Express server listening at http://localhost:${config.port}`);
  });

  const watcher = chokidar.watch(cwd, {
    ignored: [/node_modules/, `**/${config.esbuild.outdir ?? "dist"}/**`],
  });

  watcher.on("change", async () => {
    console.log("✨ endpoint changed 👉 rebuilding ...");
    await build(config.esbuild);
    router = await loadEndpoint(cwd, config);
  });
}

/**
 * A root dev server serves all API routes from the {@link AntConfig['directory']}
 */
export async function startRootDevServer(config: Required<AntConfig>) {
  consola.info(`🎏 Starting root dev server. Endpoints from ${config.directory} will be served.`);

  const endpoints = findAllProjects(config.directory);

  const endpointBuildConfigs = endpoints.reduce((configs, endpoint) => {
    /**
     * {@link BuildOptions.entryPoints} can be way too many different things !!
     */
    const entryPoints = Array.isArray(config.esbuild.entryPoints)
      ? isStringArray(config.esbuild.entryPoints)
        ? config.esbuild.entryPoints.map((entry) => normalize(`${endpoint}/${entry}`))
        : config.esbuild.entryPoints.map((entry) => ({
            in: normalize(`${endpoint}/${entry.in}`),
            out: normalize(`${endpoint}/${entry.out}`),
          }))
      : typeof config.esbuild.entryPoints === "object"
      ? Object.entries(config.esbuild.entryPoints).map(([key, value]) => ({
          in: normalize(`${endpoint}/${key}`),
          out: normalize(`${endpoint}/${value}`),
        }))
      : config.esbuild.entryPoints;

    const outdir = normalize(`${endpoint}/${config.esbuild.outdir}`);

    configs[endpoint] = { ...config.esbuild, entryPoints, outdir };

    return configs;
  }, {} as Record<string, BuildOptions>);

  await Promise.all(
    endpoints.map(async (endpoint) => {
      consola.info(`🔨 Building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
      await build(endpointBuildConfigs[endpoint]);
      consola.info(`✅ Done building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
    })
  );

  const app = express();

  /**
   * @link https://github.com/expressjs/express/issues/2596
   * Re-assigning a new router effectively refreshes all the routes.
   * Here, we also have to create routers for each endpoint and refresh them individually as needed.
   */
  let router = Router();

  const endpointMiddlewares: Record<string, Router> = {};

  await Promise.all(
    endpoints.map(async (endpoint) => {
      endpointMiddlewares[endpoint] = await loadEndpoint(endpoint, config);
    })
  );

  const refreshRouter = () => {
    router = Router();
    endpoints.forEach((endpoint) => {
      consola.info(`🔄 Loading ${endpoint} from ${endpointBuildConfigs[endpoint].outdir}`);
      router.use(`/${relative(config.directory, endpoint)}`, endpointMiddlewares[endpoint]);
    });
  };

  refreshRouter();

  app.use((req, res, next) => router(req, res, next));

  app.listen(config.port, () => {
    consola.info(`🎉 Express server listening at http://localhost:${config.port}`);
  });

  const watcher = chokidar.watch(endpoints, {
    ignored: [/node_modules/, `**/${config.esbuild.outdir ?? "dist"}/**`],
  });

  watcher.on("change", async (path) => {
    const endpoint = searchForPackageRoot(path);
    console.log("✨ endpoint changed: ", endpoint);
    await build(endpointBuildConfigs[endpoint]);
    endpointMiddlewares[endpoint] = await loadEndpoint(endpoint, config);
    refreshRouter();
  });
}
