import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    websoc: "src/websoc/index.ts",
    registrar: "src/registrar/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  outDir: "dist",
});
