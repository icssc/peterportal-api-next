import fs from "node:fs";

import { parse, type Options, type ExtendNode } from "acorn";
import type { ExportNamedDeclaration } from "estree";

type NamedExportNode = ExtendNode<ExportNamedDeclaration>;

const defaultParseOptions: Options = {
  ecmaVersion: "latest",
  sourceType: "module",
};

/**
 * In order to dynamically generate runtime files, allocate API Gateway routes, etc.
 * the built entry (handlers) file's named exports need to be statically analyzed,
 * which indicates the HTTP methods it supports.
 *
 * @example
 *
 * ```ts
 *
 * export const GET: InternalHandler = async (event) => { ... }
 * export const POST: InternalHandler = async (event) => { ... }
 *
 * ```
 *
 * Named exports of above module: ["GET", "POST"]
 *
 * @param file The path to the file to analyze.
 * @returns All the parsed file's named exports. Does __not__ filter for valid HTTP method exports.
 */
export function getNamedExports(file: string, parseOptions: Options = defaultParseOptions) {
  const fileContents = fs.readFileSync(file, "utf-8");

  const parsedFileContents = parse(fileContents, parseOptions);

  const namedExports = parsedFileContents.body
    .filter((node): node is NamedExportNode => node.type === "ExportNamedDeclaration")
    .flatMap((node) => node.specifiers.map((specifier) => specifier.exported.name));

  return namedExports;
}
