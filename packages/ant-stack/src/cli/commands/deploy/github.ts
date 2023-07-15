import { spawn } from "node:child_process";

import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { App, Stack } from "aws-cdk-lib/core";
import consola from "consola";

import { getGitHub, GitHub } from "../../../cdk/constructs/GitHub/GitHub";
import { getExistingConfigFile, synthesizeConfig, supportedConfigFiles } from "../../../config.js";
import { waitForStackIdle } from "../../../utils";

export async function deployGitHub(initializedApp?: App) {
  const app = initializedApp ?? (await synthesizeConfig());

  app.synth();

  consola.info("⏳ Waiting until all CloudFormation updates are complete");

  const cfnClient = new CloudFormationClient({});

  await Promise.all(
    app.node.children
      .filter(Stack.isStack)
      .map(async (stack) => await waitForStackIdle(cfnClient, stack.stackName))
  );

  consola.info("🚀 Deploying CDK stacks");

  const configFile = getExistingConfigFile();

  if (configFile == null) {
    throw new Error(
      `No config file found at the workspace root. Please create one of the following: ${supportedConfigFiles}`
    );
  }

  const cdkCommand = ["cdk", "deploy", "--app", configFile, "*", "--require-approval", "never"];

  let github: GitHub | undefined;

  try {
    github = await getGitHub(app);
    cdkCommand.push("--outputs-file", github.outputsFile);
  } catch (e) {
    consola.info("No GitHub construct found in the CDK app.");
  }

  await github?.onPreDeploy();

  consola.info(`Running: npx ${cdkCommand.join(" ")}`);

  const cdkChild = spawn("npx", cdkCommand);

  cdkChild.stdout.on("data", (data: Buffer) => consola.info(data.toString()));

  cdkChild.stderr.on("data", (data: Buffer) => consola.error(data.toString()));

  cdkChild.on("close", async () => github?.onPostDeploy());
}
