import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

import { findFilesRecursively } from "./src/utils";

const constructDirectory = "src/cdk/constructs";

const allFilesInConstructs = findFilesRecursively(constructDirectory);

const constructs = allFilesInConstructs
  .filter((file) => path.extname(file) === ".ts")
  .filter((file) => {
    /**
     * It's either index.ts or the directory is not the same as the file name
     */
    const directory = path.dirname(file);
    const fileName = path.basename(file, ".ts");
    return (
      fileName === "index" ||
      !fs.readdirSync(directory).some((file) => path.parse(file).name === "index")
    );
  })
  .map((file) => path.parse(file))
  .reduce((constructEntryPoints, file) => {
    const name =
      file.name === "index"
        ? path.relative(constructDirectory, file.dir)
        : path.join(path.relative(constructDirectory, file.dir), file.name);

    constructEntryPoints[`constructs/${name}`] = path.join(file.dir, file.base);

    return constructEntryPoints;
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
