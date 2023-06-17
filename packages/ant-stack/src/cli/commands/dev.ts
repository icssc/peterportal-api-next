import { existsSync, readdirSync } from "node:fs";
import { normalize, resolve } from "node:path";

import chalk from "chalk";
import chokidar from "chokidar";
import { consola } from "consola";
import { build, type BuildOptions, context } from "esbuild";
import express, { Router } from "express";

import { type AntConfig, getConfig } from "../../config.js";
import { createExpressHandler, type InternalHandler } from "../../lambda-core/internal/handler.js";
import { searchForWorkspaceRoot } from "../../utils/searchRoot.js";
import { searchForPackageRoot } from "../../utils/searchRoot.js";

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
 * lol.
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
 * A local Express dev server only serves the current endpoint from the root.
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

  const getApiRoutes = (route = "", apiDir = ".", current: string[] = []): string[] => {
    if (existsSync(`${apiDir}/${route}/package.json`)) {
      current.push(`${apiDir}/${route}`);
      return current;
    }

    const subRoutes = readdirSync(`${apiDir}/${route}`, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    return subRoutes.flatMap((subRoute) => getApiRoutes(`${route}/${subRoute}`, apiDir, current));
  };

  const endpoints = readdirSync(config.directory).flatMap((dir) =>
    getApiRoutes(dir, config.directory)
  );

  /**
   * Cache the build configs for each endpoint.
   */
  const endpointBuildConfigs: Record<string, BuildOptions> = {};

  endpoints.forEach((endpoint) => {
    consola.log("building for current endpoint: ", endpoint);

    /**
     * TODO: handle entryPoints as a {@type Record<string, string>}
     */
    const entryPoints = Array.isArray(config.esbuild.entryPoints)
      ? config.esbuild.entryPoints.map((entry) => normalize(`${endpoint}/${entry}`))
      : [normalize(`${endpoint}/${config.esbuild.entryPoints}`)];

    const outdir = normalize(`${endpoint}/${config.esbuild.outdir}`);

    endpointBuildConfigs[endpoint] = {
      ...config.esbuild,
      entryPoints,
      outdir,
      plugins: [
        ...(config.esbuild.plugins ?? []),
        {
          name: "logger",
          setup(build) {
            build.onStart(() =>
              consola.log(chalk.bgBlack.magenta(`Building temporary files to ${outdir}`))
            );

            build.onEnd(() => {
              consola.log(chalk.bgBlack.magenta(`Built temporary files to ${outdir}`));
            });
          },
        },
      ],
    };

    build(endpointBuildConfigs[endpoint]);
  });

  consola.log("commence watching the following endpoints", endpoints);

  const watcher = chokidar.watch(endpoints, {
    // ignore dist directory and node_modules
    ignored: /(^|[/\\])(dist|node_modules|\.git)/,
  });

  watcher.on("change", (path) => {
    const endpoint = searchForPackageRoot(path);
    console.log("endpoint changed: ", endpoint);
    console.log("esbuild config for endpoint: ", endpointBuildConfigs[endpoint]);
  });

  consola.info(`🚀 Routes loaded from ${config.directory}`);
}
