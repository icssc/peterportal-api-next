import { defineConfig } from "tsup";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelPath from 'path';
import topLevelUrl from 'url';
import topLevelModule from 'module';
const require = topLevelModule.createRequire(import.meta.url);
const __filename = topLevelUrl.fileURLToPath(import.meta.url);
const __dirname = topLevelPath.dirname(__filename);
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
   * Bundle __all__ dependencies into the output files to prepare for Lambda deployment.
   */
  noExternal: [/^((?!esbuild).)*$/],
});
