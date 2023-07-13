import fs from "node:fs";
import path from "node:path";

import { App } from "aws-cdk-lib";
import createJITI from "jiti";

import { getWorkspaceRoot } from "./utils/directories.js";

export const configFiles = ["ant.config.ts", "ant.config.js"];

/**
 * Initialize the root config file.
 */
export async function initConfig() {
  const workspaceRoot = getWorkspaceRoot(process.cwd());

  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);

    if (fs.existsSync(configPath)) {
      const jiti = createJITI(path.resolve(), {
        interopDefault: true,
        cache: false,
        v8cache: false,
        esmResolve: true,
        requireCache: false,
      });

      const exports = jiti(configPath);

      const main = exports.default ?? exports;

      if (typeof main !== "function") {
        throw new Error(`Config file ${configFile} must export default a function.`);
      }

      const app = await main();

      if (!App.isApp(app)) {
        throw new Error(`Function must return an App instance.`);
      }

      return app;
    }
  }

  return;
}
