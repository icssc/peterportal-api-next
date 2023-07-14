import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ApiRouteConfigOverride } from "ant-stack/constructs/Api";
import env from "../../../../../env.js";

import { cleanCopy, selectDelete } from "@libs/build-tools";

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url));

// The relative path to the generated Prisma Client.
const prismaClientDir = "./node_modules/@libs/db/node_modules/prisma";

const prismaSchema = "./node_modules/@libs/db/prisma/schema.prisma";

const outDir = resolve(cwd, "./dist");

export class Override extends ApiRouteConfigOverride {
  constructor(scope: any, id: string) {
    super(scope, id, {
      runtime: {
        esbuild: {
          plugins: [
            cleanCopy(cwd, outDir, prismaClientDir, prismaSchema),
            selectDelete(env.NODE_ENV, outDir),
          ],
        },
      },
    });
  }
}
