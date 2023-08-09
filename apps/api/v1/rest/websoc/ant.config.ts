import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AntConfigStub } from "ant-stack/config";
import env from "../../../../../env";

import { cleanCopy, selectDelete } from "@libs/build-tools";

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url));

// The relative path to the generated Prisma Client.
const prismaClientDir = "./node_modules/@libs/db/node_modules/prisma";

const prismaSchema = "./node_modules/@libs/db/prisma/schema.prisma";

const outDir = resolve(cwd, "./dist");

const config: AntConfigStub = {
  esbuild: {
    external: process.env.NODE_ENV === "development" ? [] : ["@services/websoc-proxy-service"],
    plugins: [
      cleanCopy({ cwd, outDir, prismaClientDir, prismaSchema }),
      selectDelete(env.NODE_ENV, outDir),
    ],
  },
};

export default config;
