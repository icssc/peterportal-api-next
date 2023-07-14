import fs from "node:fs";
import path from "node:path";

import { App } from "aws-cdk-lib";

import { getWorkspaceRoot } from "./utils/directories.js";
import { executeJit } from "./utils/execute-jit.js";

export const configFiles = ["ant.config.ts", "ant.config.js"];

/**
 * In CDK, "synth" is the process of executing a CDK script and generating a CloudFormation template.
 * We're also going to "synthesize" the root config in order to generate a construct tree.
 * The tree can then be searched for special constructs, which is used to determine build, deployment, etc. steps.
 */
export async function synthesizeConfig() {
  const workspaceRoot = getWorkspaceRoot(process.cwd());

  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);

    if (fs.existsSync(configPath)) {
      const exports = executeJit(configPath);

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
  }

  throw new Error(
    `No config file found at the workspace root. Please provide one of the following: ${configFiles.join(
      ", "
    )}`
  );
}

/**
 * Executes a config file if it exists, then returns the result.
 */
export function loadConfig(directory: string) {
  const foundConfileFiles = configFiles
    .map((configFile) => path.join(directory, configFile))
    .filter((configPath) => fs.existsSync(configPath));

  if (!foundConfileFiles.length) {
    return;
  }

  return executeJit(foundConfileFiles[0]);
}
