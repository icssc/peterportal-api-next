import type { AppProps, StackProps } from "aws-cdk-lib";
import { RoleProps } from "aws-cdk-lib/aws-iam";
import type { BuildOptions } from "esbuild";
import { loadConfig } from "unconfig";

/**
 * AntStack's AWS configuration.
 */
interface AntAWS {
  id: string;

  zoneName: string;

  stage?: string;

  appProps?: AppProps;

  stackProps?: StackProps;

  routeRolePropsMapping?: Record<string, RoleProps>;
}

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
}

/**
 * AntStack's development server configuration.
 */
export interface AntConfig {
  /**
   * The package manager used by the project.
   */
  packageManager: "npm" | "yarn" | "pnpm";

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
   * AWS configuration.
   */
  aws: AntAWS;

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

export async function getConfig() {
  const loadedConfig = await loadConfig<Required<AntConfig>>({
    sources: [
      {
        files: ["ant.config"],
        extensions: ["ts", "js"],
      },
    ],
    merge: true,
  });

  return loadedConfig.config;
}
