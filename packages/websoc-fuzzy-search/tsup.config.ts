import { defineConfig } from "tsup";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
// language=JavaScript
const js = `\
import topLevelPath from 'path';
import topLevelUrl from 'url';
import topLevelModule from 'module';
const require = topLevelModule.createRequire(import.meta.url);
const __filename = topLevelUrl.fileURLToPath(import.meta.url);
const __dirname = topLevelPath.dirname(__filename);
`;

const config: ReturnType<typeof defineConfig> = defineConfig({
  banner: { js },
  bundle: true,
  clean: true,
  dts: true,
  external: ["base64-arraybuffer", "pako"],
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: true,
});
export default config;
