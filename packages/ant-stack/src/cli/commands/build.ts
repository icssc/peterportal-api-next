import fs from "node:fs";
import path from "node:path";

import { build } from "esbuild";

import { type AntConfig, getConfig } from "../../config.js";
import { isHttpMethod } from "../../lambda-core/constants.js";
import {
  createBunHandler,
  createNodeHandler,
  type InternalHandler,
} from "../../lambda-core/internal/handler.js";
import { getNamedExports } from "../../utils/static-analysis.js";

/**
 * Builds an {@link InternalHandler}.
 * TODO: add the ability to specify options.
 */
export async function buildInternalHandler() {
  const config = await getConfig();

  const buildOutput = await build(config.esbuild);

  if (config.esbuild.logLevel === "info") {
    console.log(buildOutput);
  }

  await compileRuntimes(config);
}

/**
 * Lambda-Core is runtime-agnostic.
 * Do some additional steps to enable compatibility for specific runtimes. e.g. AWS Lambda Node
 */
async function compileRuntimes(config: Required<AntConfig>) {
  const { runtime } = config;

  const entryFile = path.resolve(config.esbuild.outdir ?? ".", config.runtime.entryFile);

  /**
   * The (entry) handler's exported HTTP methods.
   */
  const httpMethods = getNamedExports(entryFile).filter(isHttpMethod);

  /**
   * The runtime-specific file will import all of its handlers from the entry (handler) file.
   */
  const importHandlers = `import * as ${runtime.entryHandlersName} from '${entryFile}'`;

  // All the handler's exports are re-exported, wrapped in an adapter.

  const nodeExports = httpMethods.map(
    (method) =>
      `export const ${method} = ${createNodeHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  const bunExports = httpMethods.map(
    (method) =>
      `export const ${method} = ${createBunHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  // The lines of code in the __unbundled__ temporary .js file.

  const temporaryNodeScript = [
    `import { ${createNodeHandler.name} } from 'ant-stack'`,
    importHandlers,
    nodeExports.join("\n"),
  ];

  const temporaryBunScript = [
    `import { ${createBunHandler.name} } from 'ant-stack'`,
    importHandlers,
    bunExports.join("\n"),
  ];

  const temporaryNodeFile = path.resolve(config.esbuild.outdir ?? ".", runtime.nodeRuntimeFile);
  const temporaryBunFile = path.resolve(config.esbuild.outdir ?? ".", runtime.bunRuntimeFile);

  // Write the temporary .js files to disk.

  fs.writeFileSync(temporaryNodeFile, temporaryNodeScript.join("\n"));
  fs.writeFileSync(temporaryBunFile, temporaryBunScript.join("\n"));

  /**
   * The temporary .js files look like this:
   *
   * ```js
   *
   *  import { createNodeHandler } from 'ant-stack'
   *  import * as handlers from './index.js'
   *  export const get = createNodeHandler(handlers.get)
   *
   * ```
   *
   * Use ESBuild to each temporary file into a standalone, runtime-specific file.
   */
  await build({
    entryPoints: {
      [temporaryNodeFile.replace(/\.js$/, "")]: temporaryNodeFile,
      [temporaryBunFile.replace(/\.js$/, "")]: temporaryBunFile,
    },
    outdir: config.esbuild.outdir,
    platform: "node",
    format: "esm",
    bundle: true,
    target: "esnext",
    outExtension: {
      ".js": ".mjs",
    },
  });

  // Done with the temporary files, remove them.
  // The entry file is preserved as a reliable source of truth for other parts of the deployment.

  fs.unlinkSync(temporaryNodeFile);
  fs.unlinkSync(temporaryBunFile);
}
