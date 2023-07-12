import fs from "node:fs";
import { defineConfig } from "tsup";

const constructEntries = fs.readdirSync("./src/cdk/constructs").reduce((entries, file) => {
  entries[`constructs/${file.replace(/\.ts/, "")}`] = `./src/cdk/constructs/${file}`;
  return entries;
}, {} as Record<string, string>);

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelModule from 'module';
const require = topLevelModule.createRequire(import.meta.url);
`;

export default defineConfig({
  entry: {
    cli: "src/cli/index.ts",
    config: "src/config.ts",
    "lambda-core": "src/lambda-core/index.ts",
    utils: "src/utils/index.ts",
    ...constructEntries,
  },
  bundle: true,
  format: "esm",
  sourcemap: true,
  dts: true,
  splitting: false,
  banner: { js },
  clean: true,
  shims: true,

  /**
   * Bundle __all__ dependencies into the output files to prepare for Lambda deployment.
   */
  noExternal: [/^((?!esbuild).)*$/],
});
