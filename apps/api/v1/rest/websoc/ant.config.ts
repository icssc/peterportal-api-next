import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";

import type { AntConfig } from "ant-stack/config";
import { searchForWorkspaceRoot } from "ant-stack/utils";
import env from "../../../../../env.js";

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url));

const workspaceRoot = searchForWorkspaceRoot(cwd);

// The relative path to the generated Prisma Client.
const prismaClientDir = "./node_modules/@libs/db/node_modules/prisma";

const prismaSchema = resolve(workspaceRoot, "libs/db/prisma/schema.prisma");

/*
 * The file name of the Prisma query engine used in production. The engines need to be copied into
 * the same directory as the bundle.
 * @see {@link https://www.prisma.io/docs/concepts/components/prisma-client/module-bundlers}
 */
const prismaQueryEngine = "libquery_engine-rhel-openssl-1.0.x.so.node";

// The file extension of all Prisma query engines.
const prismaQueryEngineExt = ".so.node";

const outDir = resolve(cwd, "./dist");

/**
 * TODO: add a `AntConfigSub` variant that allows partial configuration of a root config.
 */
const config: Partial<AntConfig> = {
  esbuild: {
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
            await copyFile(prismaSchema, join(outDir, "schema.prisma"));
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
  },
};

export default config;
