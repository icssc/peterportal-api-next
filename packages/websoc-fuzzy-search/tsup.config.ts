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

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ["src/index.js"],
  bundle: true,
  clean: true,
  external: ["base64-arraybuffer", "pako"],
  format: ["esm"],
  minify: true,
  publicDir: true,
  banner(ctx) {
    return ctx.format === "esm" ? { js } : undefined;
  },
});
export default config;
