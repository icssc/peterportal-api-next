import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Plugin } from "esbuild";

type CleanCopyOptions = {
  /**
   * The current working directory.
   */
  cwd: string;
  /**
   * The output directory.
   */
  outDir: string;
  /**
   * The path to the Prisma Client.
   */
  prismaClientDir: string;
  /**
   * The path to the Prisma schema.
   */
  prismaSchema: string;
};

/**
 * Generates an instance of the clean-copy plugin. The plugin does the following:
 * - cleans the output directory;
 * - copies all Prisma query engines to the output directory;
 * - copies the Prisma schema to the output directory; and
 * - sets the mode of each query engine to 755.
 * @param options Copy options.
 */
export const cleanCopy = (options: CleanCopyOptions): Plugin => ({
  name: "clean-copy",
  setup(build) {
    build.onStart(async () => {
      await rm(options.outDir, { recursive: true, force: true });
      await mkdir(options.outDir);
      const queryEngines = (await readdir(join(options.cwd, options.prismaClientDir))).filter((x) =>
        x.endsWith(".so.node"),
      );
      await Promise.all(
        queryEngines.map((x) =>
          copyFile(join(options.cwd, `${options.prismaClientDir}/${x}`), join(options.outDir, x)),
        ),
      );
      await copyFile(options.prismaSchema, join(options.outDir, "schema.prisma"));
      await Promise.all(queryEngines.map((x) => chmod(join(options.outDir, `${x}`), 0o755)));
    });
  },
});
