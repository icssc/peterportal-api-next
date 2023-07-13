import { defineConfig } from "tsup";

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
    "constructs/Api": "src/cdk/constructs/Api/index.ts",
  },
  bundle: true,
  format: "esm",
  sourcemap: true,
  dts: true,
  splitting: false,
  banner: { js },
  clean: true,
  shims: true,
});
