import fs from "node:fs";

import { parse } from "acorn";
import type { ExportNamedDeclaration } from "estree";

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
 * @param file The path to the file to analyze.
 * @returns All the parsed file's named exports. Does __not__ filter for valid HTTP method exports.
 */
export function getNamedExports(file: string) {
  const fileContents = fs.readFileSync(file, "utf-8");

  const parsedFile = parse(fileContents, {
    ecmaVersion: "latest",
    sourceType: "module",
  });

  const namedExports = parsedFile.body
    .filter(
      (node): node is acorn.ExtendNode<ExportNamedDeclaration> =>
        node.type === "ExportNamedDeclaration"
    )
    .flatMap((node) => node.specifiers.map((s) => s.exported.name));

  return namedExports;
}
