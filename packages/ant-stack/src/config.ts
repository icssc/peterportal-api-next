import path from "node:path";

import type { Construct } from "constructs";
import { defu } from "defu";
import createJITI from "jiti";

import type { Api, ApiConfig } from "./cdk/constructs/Api.js";
import type { SsrSite } from "./cdk/constructs/SsrSite.js";
import type { StaticSite } from "./cdk/constructs/StaticSite.js";
import { findUpForFiles } from "./utils/directories.js";

type AnyConstruct = Construct | StaticSite | SsrSite | Api;

export const configFiles = ["ant.config.ts", "ant.config.js"];

export interface LoadConfigOptions {
  merge?: boolean;
}

/**
 * Synchronous implementation of unconfig
 * @link https://github.com/antfu/unconfig/blob/main/src/index.ts
 */
export function loadConfig(options: LoadConfigOptions = {}) {
  const allConfigFilePaths = findUpForFiles(configFiles, {
    cwd: process.cwd(),
    multiple: options.merge,
  });

  const jiti = createJITI(path.resolve(), {
    interopDefault: true,
    cache: false,
    v8cache: false,
    esmResolve: true,
    requireCache: false,
  });

  const apiConfigs: ApiConfig[] = [];

  allConfigFilePaths.forEach((configFilePath) => {
    const configModule = jiti(configFilePath);
    const main = configModule.default;
    const app: Construct = main();

    const children = app.node.children as AnyConstruct[];

    children.forEach((child) => {
      if (!("type" in child)) {
        return;
      }

      switch (child.type) {
        case "ssr-site":
          console.log("is ssr site: ", child);
          break;

        case "static-site":
          console.log("is static site: ", child);
          break;

        case "api":
          apiConfigs.push(child.config);
          break;
      }
    });
  });

  const api = defu(...(apiConfigs as [ApiConfig, ...ApiConfig[]]));

  return {
    api,
  };
}
