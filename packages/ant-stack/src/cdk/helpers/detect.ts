import { App } from "aws-cdk-lib";

import packageJson from "../../../package.json";
import { synthesizeConfig } from "../../config.js";
import { getWorkspaceRoot } from "../../utils";
import { getApi } from "../constructs/applications/Api";

export async function detectConstruct(initializedApp?: App, directory = process.cwd()) {
  const workspaceRoot = getWorkspaceRoot(directory);

  const app = initializedApp ?? (await synthesizeConfig());

  try {
    const api = await getApi(app);

    /**
     * If it's the workspace root or an ApiRoute in a sub-directory that's part of the Api construct.
     */
    if (directory === workspaceRoot || Object.keys(api.routes).includes(directory)) {
      return api;
    }
  } catch {
    console.log("No API construct found");
  }

  throw new Error(`No special construct from ${packageJson.name} found.`);
}
