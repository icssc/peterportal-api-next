import fs from "node:fs";
import path from "node:path";

import { App } from "aws-cdk-lib";

import { getWorkspaceRoot } from "./utils/directories.js";
import { executeJit } from "./utils/execute-jit.js";

export const dryRunKey = "klein_stack_dryrun";

export const configFiles = ["ant.config.ts", "ant.config.js"];

export const supportedConfigFiles = configFiles.join(", ");

export function getExistingConfigFile() {
  const workspaceRoot = getWorkspaceRoot(process.cwd());

  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);

    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return undefined;
}

/**
 * "cdk synth" executes a CDK script and generates a CloudFormation template.
 * We're also going to "synthesize" the root config in order to generate a construct tree.
 * The tree can then be searched for our special constructs, which is used to determine build, deployment, etc. steps.
 */
export async function synthesizeConfig() {
  const configFile = getExistingConfigFile();

  if (configFile == null) {
    throw new Error(
      `No config file found at the workspace root. Please create one of the following: ${supportedConfigFiles}`
    );
  }

  process.env[dryRunKey] = "true";

  const exports = executeJit(configFile);

  const main = exports.default ?? exports.main;

  if (typeof main !== "function") {
    throw new Error(`Config file ${configFile} must export default a function.`);
  }

  const app = await main();

  if (!App.isApp(app)) {
    throw new Error(`Main function must return an App instance.`);
  }

  return app;
}

/**
 * Synchronously JIT-executes a config file from the target directory if it exists.
 *
 * @returns the result of the config file after execution, i.e. its exports.
 */
export function loadConfigFrom(directory: string): Record<string, unknown> {
  const foundConfileFiles = configFiles
    .map((configFile) => path.join(directory, configFile))
    .filter((configPath) => fs.existsSync(configPath));

  if (!foundConfileFiles.length) {
    return {};
  }

  /**
   * Only execute the first config file found.
   */
  return executeJit(foundConfileFiles[0]);
}
