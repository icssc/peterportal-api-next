import { join, relative } from "node:path";
import { fileURLToPath as futp } from "node:url";

import * as cdk from "aws-cdk-lib";

import { getConfig } from "../config.js";
import { findAllProjects } from "../utils/searchProjects.js";
import { searchForWorkspaceRoot } from "../utils/searchRoot";
import { AntStack, type HandlerConfig } from "./stack.js";

const __dirname = futp(new URL(".", import.meta.url));

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
      throw new Error("Cannot deploy stack in development environment. Stop.");

    default:
      throw new Error("Invalid environment specified. Stop.");
  }
}

async function start() {
  const config = await getConfig();

  /**
   * TODO: schema validation.
   */
  config.env ??= {};
  config.env.stage = getStage(config.env.NODE_ENV);

  const app = new cdk.App(config.aws.appProps);

  /**
   * Configs for all __unique__ Lambda routes.
   */
  const handlerConfigs: HandlerConfig[] = findAllProjects(
    join(searchForWorkspaceRoot(__dirname), config.directory)
  )
    .map((apiRoute) => ({
      route: relative(config.directory, apiRoute),
      directory: apiRoute,
      env: config.env,
    }))
    .filter(
      (config, index, configs) => configs.findIndex((c) => c.route === config.route) === index
    );
  const stack = new AntStack(app, config);

  await Promise.all(handlerConfigs.map((handlerConfig) => stack.addRoute(handlerConfig)));
}

start();
