import { defineConfig } from "tsup";

const config: ReturnType<typeof defineConfig> = defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  external: ["base64-arraybuffer", "pako"],
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: true,
});
export default config;
