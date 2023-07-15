import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { getApiRoute, ApiRoute } from "../../../cdk/constructs/Api";
import packageJson from "../../../../package.json";
import { isHttpMethod } from "../../../lambda-core/constants.js";
import { createBunHandler, createNodeHandler } from "../../../lambda-core/internal/handler.js";
import { getNamedExports } from "../../../utils/static-analysis.js";

/**
 * Build stuff.
 */
export async function buildApi() {
  const apiRoute = await getApiRoute();

  apiRoute.config.runtime.esbuild ??= {};
  apiRoute.config.runtime.esbuild.outdir ??= apiRoute.outDirectory;

  const outFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.index);

  apiRoute.config.runtime.esbuild.entryPoints ??= {
    [outFile.replace(/.js$/, "")]: apiRoute.entryFile,
  };

  const buildOutput = await build(apiRoute.config.runtime.esbuild);

  if (apiRoute.config.runtime.esbuild?.logLevel === "info") {
    console.log(buildOutput);
  }

  await compileRuntimes(apiRoute);
}

/**
 * Lambda-Core is runtime-agnostic.
 * Do some additional steps to enable compatibility for specific runtimes. e.g. AWS Lambda Node
 */
async function compileRuntimes(apiRoute: ApiRoute) {
  const { runtime } = apiRoute.config;

  const builtEntryFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.index);
  const builtNodeFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.node);
  const builtBunFile = path.join(apiRoute.outDirectory, apiRoute.outFiles.bun);

  const temporaryNodeFile = builtNodeFile.replace(/.js$/, ".temp.js");
  const temporaryBunFile = builtBunFile.replace(/.js$/, ".temp.js");

  /**
   * The (entry) handler's exported HTTP methods.
   */
  const httpMethods = getNamedExports(builtEntryFile).filter(isHttpMethod);

  /**
   * The runtime-specific file will import all of its handlers from the entry (handler) file.
   */
  const importHandlers = `import * as ${runtime.entryHandlersName} from '${builtEntryFile}'`;

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
    `import { ${createNodeHandler.name} } from '${packageJson.name}'`,
    importHandlers,
    nodeExports.join("\n"),
  ];

  const temporaryBunScript = [
    `import { ${createBunHandler.name} } from '${packageJson.name}'`,
    importHandlers,
    bunExports.join("\n"),
  ];

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
      [builtNodeFile.replace(/\.js$/, "")]: temporaryNodeFile,
      [builtBunFile.replace(/\.js$/, "")]: temporaryBunFile,
    },
    outdir: apiRoute.outDirectory,
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
