import { chmod, copyFile, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

// The relative path to the generated Prisma Client.
const prismaClientDir = "../../../node_modules/prisma/";

const prismaSchema = "../../../libs/db/prisma/schema.prisma";

/*
 * The file name of the Prisma query engine. This needs to be copied into the
 * same directory as the bundle.
 * @see {@link https://www.prisma.io/docs/concepts/components/prisma-client/module-bundlers}
 */
const prismaQueryEngine = "libquery_engine-rhel-openssl-1.0.x.so.node";

(async () => {
  const cwd = dirname(fileURLToPath(import.meta.url));
  /** @type {import("esbuild").BuildOptions} */
  const options = {
    bundle: true,
    entryPoints: [join(cwd, "index.ts")],
    logLevel: "info",
    minify: true,
    outfile: join(cwd, "dist/index.cjs"),
    platform: "node",
    plugins: [
      {
        name: "clean",
        setup(build) {
          build.onStart(async () => {
            await rm(join(cwd, "dist/"), { recursive: true, force: true });
            await mkdir(join(cwd, "dist/"));
          });
        },
      },
      {
        name: "copy",
        setup(build) {
          build.onEnd(async () => {
            // prisma
            await copyFile(
              join(cwd, `${prismaClientDir}${prismaQueryEngine}`),
              join(cwd, `dist/${prismaQueryEngine}`)
            );
            await copyFile(join(cwd, prismaSchema), join(cwd, "dist/schema.prisma"));
            await chmod(join(cwd, `dist/${prismaQueryEngine}`), 0o755);
          });
        },
      },
    ],
    target: "node16",
  };
  await build(options);
})();
