import path from "node:path";
import { defineConfig } from "tsup";

import { getAllFilesOrIndex } from "./src/utils/files.js";

const files = getAllFilesOrIndex("./src/cdk/constructs");

const constructs = files.reduce((currentConstructs, file) => {
  const name = path.basename(file).startsWith("index")
    ? path.basename(path.dirname(file))
    : path.basename(file);
  currentConstructs[`constructs/${name}`] = file;
  return currentConstructs;
}, {} as Record<string, string>);

export default defineConfig({
  entry: {
    cli: "src/cli/index.ts",
    config: "src/config.ts",
    "lambda-core": "src/lambda-core/index.ts",
    utils: "src/utils/index.ts",
    ...constructs,
  },
  bundle: true,
  format: ["esm"],
  sourcemap: true,
  dts: true,
  splitting: false,
  clean: true,
  shims: true,
});
