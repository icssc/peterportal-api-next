/**
 * Bruh, using the {@link defineConfig} helper makes {@link loadConfig} take so much longer!!
 * (JITI has to just-in-time compile __ALL__ the TypeScript)
 * import { defineConfig } from 'peterportal-api-sst'
 * export default defineConfig({ ... })
 */
import type { AntConfig, defineConfig } from "ant-stack/config";
import type { loadConfig } from "unconfig";

import env from "./env.js";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { chmod, copyFile, mkdir, readdir, rm } from "fs/promises";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url));

// The relative path to the generated Prisma Client.
const prismaClientDir = "./node_modules/prisma/";

const prismaSchema = "./libs/db/prisma/schema.prisma";

/*
 * The file name of the Prisma query engine used in production. The engines need to be copied into
 * the same directory as the bundle.
 * @see {@link https://www.prisma.io/docs/concepts/components/prisma-client/module-bundlers}
 */
const prismaQueryEngine = "libquery_engine-rhel-openssl-1.0.x.so.node";

// The file extension of all Prisma query engines.
const prismaQueryEngineExt = ".so.node";

export const inDir = "./src";
export const outDir = "./dist";
export const entryFileName = "index";

/**
 * Just using types is a lot faster!!
 */
const config: AntConfig = {
  packageManager: "pnpm",
  port: 8080,
  aws: {
    id: "peterportal-api-next",
    zoneName: "peterportal.org",
  },
  env,
  directory: "apps/api",
  esbuild: {
    entryPoints: [`${inDir}/${entryFileName}.ts`],
    external: ["@aws-sdk/client-lambda"],
    outdir: outDir,
    platform: "node",
    format: "esm",
    target: "esnext",
    bundle: true,
    minify: true,
    assetNames: "[name]",
    loader: {
      ".env": "copy",
    },
    plugins: [
      {
        name: "clean-copy",
        setup(build) {
          build.onStart(async () => {
            await rm(outDir, { recursive: true, force: true });
            console.log(resolve(outDir));
            await mkdir(outDir);
            const queryEngines = (await readdir(join(cwd, prismaClientDir))).filter((x) =>
              x.endsWith(prismaQueryEngineExt)
            );
            await Promise.all(
              queryEngines.map((x) =>
                copyFile(join(cwd, `${prismaClientDir}/${x}`), join(outDir, x))
              )
            );
            await copyFile(join(cwd, prismaSchema), join(outDir, "schema.prisma"));
            await Promise.all(queryEngines.map((x) => chmod(join(outDir, `${x}`), 0o755)));
          });
        },
      },
      {
        name: "select-delete",
        setup(build) {
          build.onEnd(async () => {
            if (env.NODE_ENV === "development") return;
            const queryEngines = (await readdir(outDir)).filter((x) =>
              x.endsWith(prismaQueryEngineExt)
            );
            if (queryEngines.length === 1) return;
            await Promise.all(
              queryEngines.filter((x) => x !== prismaQueryEngine).map((x) => rm(join(outDir, x)))
            );
          });
        },
      },
    ],
    banner: { js },
  },
  runtime: {
    entryFile: `${entryFileName}.js`,
    entryHandlersName: "InternalHandlers",
    lambdaCoreFile: "lambda-core.js",
    nodeRuntimeFile: "lambda-node-runtime.js",
    bunRuntimeFile: "lambda-bun-runtime.js",
  },
};

export default config;
