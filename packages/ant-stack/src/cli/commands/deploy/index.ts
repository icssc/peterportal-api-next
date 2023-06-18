import { relative } from "node:path";

import { CloudFormationClient, UpdateStackCommand } from "@aws-sdk/client-cloudformation";
import { App } from "aws-cdk-lib";
import { consola } from "consola";

import { getConfig } from "../../../config.js";
import { findAllProjects } from "../../../utils/searchProjects.js";
import { AntStack, type HandlerConfig } from "./stack.js";

function getStage(NODE_ENV: string) {
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

export async function deploy() {
  const config = await getConfig();

  /**
   * TODO: schema validation.
   */
  config.env ??= {};
  config.env.stage = getStage(config.env.NODE_ENV);

  const app = new App(config.aws.appProps);

  /**
   * Configs for all __unique__ Lambda routes.
   */
  const handlerConfigs: HandlerConfig[] = findAllProjects(config.directory)
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

  const cloudAssembly = app.synth();
  const cfnTemplate = cloudAssembly.getStackByName(stack.stackName).template;
  const cfnClient = new CloudFormationClient({});
  const response = await cfnClient.send(
    new UpdateStackCommand({
      StackName: stack.stackName,
      TemplateBody: cfnTemplate,
    })
  );
  consola.info(response);
}
