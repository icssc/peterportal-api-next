import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { Plugin } from "esbuild";

/**
 *
 * @param nodeEnv
 * @param outDir
 */
export const selectDelete = (nodeEnv: string, outDir: string): Plugin => ({
  name: "select-delete",
  setup(build) {
    build.onEnd(async () => {
      if (nodeEnv === "development") return;
      const queryEngines = (await readdir(outDir)).filter((x) => x.endsWith(".so.node"));
      if (queryEngines.length === 1) return;
      await Promise.all(
        queryEngines
          .filter((x) => x !== "libquery_engine-rhel-openssl-1.0.x.so.node")
          .map((x) => rm(join(outDir, x)))
      );
    });
  },
});
