import { defineConfig } from "tsup";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;

export default defineConfig({
  entry: {
    cli: "src/cli/index.ts",
    config: "src/config.ts",
    "lambda-core": "src/lambda-core/index.ts",
    utils: "src/utils/index.ts",
  },
  bundle: true,
  format: "esm",
  sourcemap: true,
  dts: true,
  splitting: false,
  banner: { js },
  clean: true,

  /**
   * Bundle **all** dependencies into the output files to prepare for Lambda deployment.
   */
  noExternal: [/^((?!esbuild).)*$/],
});
