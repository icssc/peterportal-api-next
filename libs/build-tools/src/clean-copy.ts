import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Plugin } from "esbuild";

/**
 * Generates an instance of the clean-copy plugin. The plugin does the following:
 * - cleans the output directory;
 * - copies all Prisma query engines to the output directory;
 * - copies the Prisma schema to the output directory; and
 * - sets the mode of each query engine to 755.
 * @param cwd The current working directory.
 * @param outDir The output directory.
 * @param prismaClientDir The path to the Prisma Client.
 * @param prismaSchema The path to the Prisma schema.
 */
export const cleanCopy = (
  cwd: string,
  outDir: string,
  prismaClientDir: string,
  prismaSchema: string
): Plugin => ({
  name: "clean-copy",
  setup(build) {
    build.onStart(async () => {
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir);
      const queryEngines = (await readdir(join(cwd, prismaClientDir))).filter((x) =>
        x.endsWith(".so.node")
      );
      await Promise.all(
        queryEngines.map((x) => copyFile(join(cwd, `${prismaClientDir}/${x}`), join(outDir, x)))
      );
      await copyFile(prismaSchema, join(outDir, "schema.prisma"));
      await Promise.all(queryEngines.map((x) => chmod(join(outDir, `${x}`), 0o755)));
    });
  },
});
