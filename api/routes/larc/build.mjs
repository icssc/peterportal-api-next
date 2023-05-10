import { build } from "esbuild";
import { chmod, copyFile, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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
            await copyFile(
              join(
                cwd,
                "../../../node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node"
              ),
              join(cwd, "dist/libquery_engine-rhel-openssl-1.0.x.so.node")
            );
            await copyFile(
              join(cwd, "../../../node_modules/.prisma/client/schema.prisma"),
              join(cwd, "dist/schema.prisma")
            );
            await chmod(
              join(cwd, "dist/libquery_engine-rhel-openssl-1.0.x.so.node"),
              0o755
            );
          });
        },
      },
    ],
    target: "node16",
  };
  await build(options);
})();
