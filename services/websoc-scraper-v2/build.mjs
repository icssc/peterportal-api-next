import { chmod, copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

const js = `\
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;

async function buildApp() {
  console.log("🔨 Starting websoc-scraper-v2 build");
  const options = {
    entryPoints: { index: "index.ts" },
    outdir: "dist",
    outExtension: { ".js": ".mjs" },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "node",
    target: "node16",
    logLevel: "info",
    banner: { js },
    plugins: [
      {
        name: "clean",
        setup(build) {
          build.onStart(async () => {
            await rm(join(__dirname, "dist/"), { recursive: true, force: true });
            await mkdir(join(__dirname, "dist/"));
          });
        },
      },
      {
        name: "copy",
        setup(build) {
          build.onEnd(async () => {
            await copyFile(
              join(
                __dirname,
                "../../libs/db/node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node",
              ),
              join(__dirname, "dist/libquery_engine-debian-openssl-3.0.x.so.node"),
            );
            await copyFile(
              join(__dirname, "../../libs/db/prisma/schema.prisma"),
              join(__dirname, "dist/schema.prisma"),
            );
            await chmod(
              join(__dirname, "dist/libquery_engine-debian-openssl-3.0.x.so.node"),
              0o755,
            );
            await rm(join(__dirname, "node_modules/"), { recursive: true, force: true });
          });
        },
      },
    ],
  };
  await build(options);
  console.log(
    "✅ Build complete! Remember to run pnpm install after deploying the Docker container.",
  );
}

buildApp().then();
