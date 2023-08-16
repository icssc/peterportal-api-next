import { join, relative, resolve } from "node:path";

import { createErrorResult, createExpressHandler, logger, zeroUUID } from "ant-stack";
import { getConfig } from "ant-stack/config";
import {
  findAllProjects,
  isMethod,
  isStringArray,
  MethodsToExpress,
  searchForWorkspaceRoot,
} from "ant-stack/utils";
import bodyParser from "body-parser";
import { consola } from "consola";
import cors from "cors";
import { build } from "esbuild";
import type { BuildOptions } from "esbuild";
import express from "express";
import { Router } from "express";
import supertest from "supertest";
import type { SuperTest, Test } from "supertest";
import { test } from "vitest";
import type { TestAPI } from "vitest";

export const it: TestAPI<{ app: SuperTest<Test> }> = test.extend({
  app: async ({ task: _ }, use) => {
    const config = await getConfig();
    const cwd = process.cwd();
    const workspaceRoot = searchForWorkspaceRoot(cwd);
    config.directory = join(workspaceRoot, config.directory);
    const endpoints = findAllProjects(config.directory);
    const endpointBuildConfigs = endpoints.reduce(
      (configs, endpoint) => {
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
    await Promise.all(
      endpoints.map(async (endpoint) => {
        consola.info(`🔨 Building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
        await build(endpointBuildConfigs[endpoint]);
        consola.info(`✅ Done building ${endpoint} to ${endpointBuildConfigs[endpoint].outdir}`);
      }),
    );
    const app = express();
    app.use(cors(), bodyParser.json());
    const router = Router();
    const endpointMiddleware: Record<string, Router> = {};
    await Promise.all(
      endpoints.map(async (endpoint: string) => {
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
      }),
    ).then(() => {
      endpoints.forEach((endpoint) => {
        const api = `/${relative(config.directory, endpoint)}`;
        consola.info(`🔄 Loading ${api} from ${endpointBuildConfigs[endpoint].outdir}`);
        router.use(api, (req, res, next) => endpointMiddleware[endpoint](req, res, next));
      });
      router.all("*", (req, res) => {
        logger.info(
          `${req.method} ${req.path} ${JSON.stringify(
            req.method === "GET" ? req.query : req.body,
          )}`,
        );
        const { statusCode, body, headers } = createErrorResult(
          404,
          "The requested resource could not be found.",
          zeroUUID,
        );
        res.status(statusCode).set(headers).json(JSON.parse(body));
      });
    });
    app.use((req, res, next) => router(req, res, next));
    await use(supertest(app));
  },
});
