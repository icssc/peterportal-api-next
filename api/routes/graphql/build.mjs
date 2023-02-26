import { build } from "esbuild";
import { cp, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

(async () => {
  const cwd = dirname(fileURLToPath(import.meta.url));
  /** @type {import("esbuild").BuildOptions} */
  const options = {
    bundle: true,
    entryPoints: [join(cwd, "index.ts"), join(cwd, "resolver/websoc.ts")],
    logLevel: "error",
    minify: true,
    outdir: join(cwd, "dist/"),
    outExtension: { ".js": ".cjs" },
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
            await cp(join(cwd, "schema/"), join(cwd, "dist/schema/"), {
              recursive: true,
            });
          });
        },
      },
    ],
    target: "node16",
  };
  await build(options);
})();
