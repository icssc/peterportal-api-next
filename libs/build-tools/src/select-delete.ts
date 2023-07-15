import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "esbuild";

/**
 *
 * @param nodeEnv
 * @param outDir
 */
export const selectDelete = (nodeEnv: string, outDir: string): Plugin => ({
  name: "select-delete",
  setup(build) {
    build.onEnd(async () => {
      if (nodeEnv === "development") {
        return;
      }

      const queryEngines = fs.readdirSync(outDir).filter((x) => x.endsWith(".so.node"));

      if (queryEngines.length === 1) {
        return;
      }

      queryEngines
        .filter((x) => x !== "libquery_engine-linux-arm64-openssl-1.0.x.so.node")
        .map((x) => fs.rmSync(path.join(outDir, x)));
    });
  },
});
