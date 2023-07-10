import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import * as cdk from "aws-cdk-lib";

import { getConfig } from "../config.js";
import { findAllProjects, getWorkspaceRoot } from "../utils/directories.js";

import { AntStack, type HandlerConfig } from "./stack.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const workspaceRoot = getWorkspaceRoot(__dirname);

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

async function main() {
  const config = await getConfig();

  /**
   * TODO: schema validation.
   */
  config.env ??= {};
  delete config.env.env;
  delete config.env.envSchema;
  config.env.stage = getStage(config.env.NODE_ENV);

  const app = new cdk.App(config.aws.appProps);

  /**
   * Configs for all __unique__ Lambda routes.
   */
  const handlerConfigs: HandlerConfig[] = findAllProjects(join(workspaceRoot, config.directory))
    .map((apiRoute) => ({
      route: relative(join(workspaceRoot, config.directory), apiRoute),
      directory: apiRoute,
      env: config.env,
      rolePropsMapping: config.aws.routeRolePropsMapping,
    }))
    .filter(
      (config, index, configs) => configs.findIndex((c) => c.route === config.route) === index
    );

  const stack = new AntStack(app, config);

  await Promise.all(handlerConfigs.map((handlerConfig) => stack.addRoute(handlerConfig)));
}

main();
