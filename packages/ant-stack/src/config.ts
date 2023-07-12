import path from "node:path";

import { App, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import createJITI from "jiti";

import type { Api, ApiSettings } from "./cdk/constructs/Api.js";
import type { SsrSite } from "./cdk/constructs/SsrSite.js";
import type { StaticSite } from "./cdk/constructs/StaticSite.js";
import { findUpForFiles } from "./utils/directories.js";

type SpecialConstruct = StaticSite | SsrSite | Api | ApiSettings;

type AnyNodeChild = Construct | Stack | SpecialConstruct;

export const configFiles = ["ant.config.ts", "ant.config.js"];

export interface LoadConfigOptions {
  merge?: boolean;
}

/**
 * Synchronous implementation of unconfig
 * @link https://github.com/antfu/unconfig/blob/main/src/index.ts
 */
export function loadConfig(options: LoadConfigOptions = {}) {
  const configFilePaths = findUpForFiles(configFiles, {
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

  const app = new App();

  const stacks = app.node.children.filter(isStack);

  /**
   * TODO: handle multiple stacks.
   */
  const stackChildren = stacks[0].node.children as AnyNodeChild[];

  const specialChildren = stackChildren.filter(isSpecialConstruct);

  return specialChildren;
}

function isStack(child: unknown): child is Stack {
  return Stack.isStack(child);
}

function isSpecialConstruct(child: unknown): child is SpecialConstruct {
  return Construct.isConstruct(child) && "type" in child;
}

export { App };
