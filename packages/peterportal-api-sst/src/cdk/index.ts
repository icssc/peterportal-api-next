import { existsSync, readdirSync } from "node:fs";
import { relative } from "node:path";

import * as cdk from "aws-cdk-lib";

import { getConfig } from "../config.js";
import { type ApiProps, ElysiaStack } from "./stack.js";

// import { env } from '../../../env'
let env: any;

function getStage(NODE_ENV = "development") {
  switch (NODE_ENV) {
    case "production":
      return "prod";

    case "staging": {
      if (!process.env.PR_NUM)
        throw new Error("Running in staging environment but no PR number specified. Stop.");
      return `staging-${process.env.PR_NUM}`;
    }

    case "development":
      return "dev";
    // throw new Error("Cannot deploy stack in development environment. Stop.");

    default:
      throw new Error("Invalid environment specified. Stop.");
  }
}

const app = new cdk.App();

const stage = getStage(env.NODE_ENV);

const id = "peterportal-elysia";

const apiDir = "../../../apps/api";

const apiRoutes = readdirSync(apiDir);

const getApiRoutes = (route = "", current: string[] = []): string[] => {
  if (existsSync(`${apiDir}/${route}/package.json`)) {
    current.push(`${apiDir}/${route}`);
    return current;
  }
  const subRoutes = readdirSync(`${apiDir}/${route}`);
  return subRoutes.flatMap((subRoute) => getApiRoutes(`${route}/${subRoute}`, current));
};

async function start() {
  /**
   * Configs for all unique Lambda routes.
   */
  const handlerConfigs: ApiProps[] = apiRoutes
    .flatMap((route) =>
      getApiRoutes(route).map((apiRoute) => ({
        route: relative(apiDir, apiRoute),
        directory: apiRoute,
        env,
      }))
    )
    .filter(
      (config, index, configs) => configs.findIndex((c) => c.route === config.route) === index
    );

  const stack = new ElysiaStack(app, id, {}, stage);

  const config = await getConfig();

  Promise.all(handlerConfigs.map((handlerConfig) => stack.addRoute(handlerConfig, config)));
}

start();
