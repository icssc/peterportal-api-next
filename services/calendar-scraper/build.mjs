import { chmod, copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1623640043
 */
// language=JavaScript
const js = `
  import topLevelModule from "node:module";
  import topLevelUrl from "node:url";
  import topLevelPath from "node:path";

  const require = topLevelModule.createRequire(import.meta.url);
  const __filename = topLevelUrl.fileURLToPath(import.meta.url);
  const __dirname = topLevelPath.dirname(__filename);
`;

async function buildApp() {
  const options = {
    entryPoints: { index: "src/index.ts" },
    outdir: "dist",
    outExtension: { ".js": ".mjs" },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "node",
    target: "node20",
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
                "../../libs/db/node_modules/prisma/libquery_engine-linux-arm64-openssl-3.0.x.so.node",
              ),
              join(__dirname, "dist/libquery_engine-linux-arm64-openssl-3.0.x.so.node"),
            );
            await copyFile(
              join(__dirname, "../../libs/db/prisma/schema.prisma"),
              join(__dirname, "dist/schema.prisma"),
            );
            await chmod(
              join(__dirname, "dist/libquery_engine-linux-arm64-openssl-3.0.x.so.node"),
              0o755,
            );
          });
        },
      },
    ],
  };
  await build(options);
}

buildApp().then();
