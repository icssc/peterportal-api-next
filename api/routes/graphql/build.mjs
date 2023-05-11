import { build } from "esbuild";
import { cp, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildApp() {
  await build({
    bundle: true,
    entryPoints: [join(__dirname, "index.ts")],
    logLevel: "info",
    minify: true,
    outfile: join(__dirname, "dist/index.cjs"),
    platform: "node",
    plugins: [
      {
        name: "clean",
        setup(build) {
          build.onStart(async () => {
            await rm(join(__dirname, "dist/"), {
              recursive: true,
              force: true,
            });
            await mkdir(join(__dirname, "dist/"));
          });
        },
      },
      {
        name: "copy",
        setup(build) {
          build.onEnd(async () => {
            await cp(join(__dirname, "schema/"), join(__dirname, "dist/schema/"), {
              recursive: true,
            });
          });
        },
      },
    ],
    target: "node16",
  });
}

buildApp();
