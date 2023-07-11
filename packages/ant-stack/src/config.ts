import fs from "node:fs";
import path from "node:path";

import { FunctionProps } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { defu } from "defu";
import type { BuildOptions } from "esbuild";
import createJITI from "jiti";
import { loadConfig, type LoadConfigOptions } from "unconfig";

import { findUpForFiles } from "./utils";

/**
 * Options that control dynamically generated files for different runtimes.
 */
interface AntRuntime {
  /**
   * The name of the built file with all the handlers for the route.
   * @example dist/index.js
   */
  entryFile: string;

  /**
   * What to name the imported handles from the built entry file.
   *
   * @example entryHandlersName = InternalHandlers
   * import * as InternalHandlers from './<entryFile>'
   */
  entryHandlersName: string;

  /**
   * Name of lambda-core file. Contains all the necessary runtime code/helpers.
   * @example lambdaCoreFile = 'lambda-core.js'
   * import { createNodeHandler } from './lambda-core.js'
   */
  lambdaCoreFile: string;

  /**
   * Name of dynamically generated script for AWS Lambda's NodeJS runtime.
   * @example 'lambda-node-runtime.js'
   */
  nodeRuntimeFile: string;

  /**
   * Name of dynamically generated script for AWS Lambda's Bun runtime.
   * @example 'lambda-bun-runtime.js'
   */
  bunRuntimeFile: string;
}

/**
 * AntStack's development server configuration.
 */
export interface AntConfig {
  /**
   * Directory to recursively find API routes.
   */
  directory: string;

  /**
   * Port to start the Express development server on.
   */
  port: number | string;

  /**
   * Esbuild options.
   */
  esbuild: BuildOptions;

  /**
   * Options for dynamically generating the different AWS Lambda runtime scripts.
   */
  runtime: AntRuntime;

  /**
   * A function that can be invoked to generate dynamic function props for the specific handler.
   */
  functionProps?: (construct: Construct, id: string) => Partial<FunctionProps>;

  /**
   * Environment variables.
   */
  env: Record<string, string>;
}

/**
 * Stub for the root AntStack config. Useful for customizing route build behavior.
 */
export type AntConfigStub = Partial<AntConfig>;

/**
 * Helper function to create configuration with type information in the input.
 * FIXME: this is very slow when used with {@link loadConfig} !
 */
export const defineConfig = (config: AntConfig) => config;

export type GetConfigOptions = Partial<LoadConfigOptions<AntConfig>>;

export async function getConfig(options: GetConfigOptions = {}) {
  const mergedOptions = defu(options, {
    sources: [
      {
        files: ["ant.config"],
        extensions: ["ts", "js"],
      },
    ],
    merge: true,
  });

  const loadedConfig = await loadConfig<Required<AntConfig>>(mergedOptions);

  return loadedConfig.config;
}

export const configFiles = ["ant.config.ts", "ant.config.js"];

export function configFileExists(directory: string) {
  return configFiles.some((file) => fs.existsSync(path.resolve(directory, file)));
}

export function loadConfigSync(options: GetConfigOptions = {}) {
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

  const config = allConfigFilePaths.reduce((currentConfig, configFilePath) => {
    const configModule = jiti(configFilePath);
    const mergedConfig = defu(currentConfig, configModule.default);
    return mergedConfig;
  }, {} as AntConfig);

  return config;
}
