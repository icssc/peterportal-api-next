import fs from "node:fs";
import path from "node:path";

import { parse } from "acorn";
import { build } from "esbuild";
import type { ExportNamedDeclaration } from "estree";

import { type AntConfig, getConfig } from "../../config.js";
import { isHttpMethod } from "../../lambda-core/constants.js";
import {
  createBunHandler,
  createNodeHandler,
  type InternalHandler,
} from "../../lambda-core/internal/handler.js";

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

  compileRuntimes(config);
}

/**
 * Lambda-Core is runtime-agnostic.
 * Do some additional steps to enable compatibility for specific runtimes. e.g. AWS Lambda Node
 */
function compileRuntimes(config: Required<AntConfig>) {
  const { runtime } = config;

  const fileContents = fs.readFileSync(
    path.resolve(config.esbuild.outdir ?? ".", config.runtime.entryFile),
    "utf-8"
  );

  const parsedFile = parse(fileContents, {
    ecmaVersion: "latest",
    sourceType: "module",
  });

  /**
   * Original exports without any modifications.
   */
  const rawExports = parsedFile.body
    .filter(
      (node): node is acorn.ExtendNode<ExportNamedDeclaration> =>
        node.type === "ExportNamedDeclaration"
    )
    .flatMap((node) => node.specifiers.map((s) => s.exported.name))
    .filter(isHttpMethod);

  /**
   * Copy the core runtime file: has adapter logic that allows the handlers to run on different runtimes.
   */
  fs.copyFileSync(
    path.resolve(__dirname, config.runtime.lambdaCoreFile),
    path.resolve(config.esbuild.outdir ?? ".", config.runtime.lambdaCoreFile)
  );

  /**
   * First line with imports always the same.
   */
  const firstLine = `import * as ${runtime.entryHandlersName} from './${runtime.entryFile}'`;

  const nodeExports = rawExports.map(
    (method) =>
      `export const ${method} = ${createNodeHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  const bunExports = rawExports.map(
    (method) =>
      `export const ${method} = ${createBunHandler.name}(${runtime.entryHandlersName}.${method})`
  );

  const nodeRuntimeScript = [
    firstLine,
    `import { ${createNodeHandler.name} } from './${config.runtime.lambdaCoreFile}'`,
    nodeExports.join("\n"),
  ];

  const bunRuntimeScript = [
    firstLine,
    `import { ${createBunHandler.name} } from './${config.runtime.lambdaCoreFile}'`,
    bunExports.join("\n"),
  ];

  fs.writeFileSync(
    path.resolve(config.esbuild.outdir ?? ".", runtime.nodeRuntimeFile),
    nodeRuntimeScript.join("\n")
  );

  fs.writeFileSync(
    path.resolve(config.esbuild.outdir ?? ".", runtime.bunRuntimeFile),
    bunRuntimeScript.join("\n")
  );
}
