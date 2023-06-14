import { resolve } from "node:path";

import chalk from "chalk";
import { consola } from "consola";
import { context } from "esbuild";
import express, { Router } from "express";

import { getConfig } from "../../config.js";
import { createExpressHandler, type InternalHandler } from "../../lambda-core/internal/handler.js";

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
