import { cpSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { ApiPropsOverride } from "@bronya.js/api-construct";

import { esbuildOptions, constructs } from "../../../../bronya.config";

export const overrides: ApiPropsOverride = {
  esbuild: {
    ...esbuildOptions,
    plugins: [
      {
        name: "copy-graphql-schema",
        setup(build) {
          build.onStart(async () => {
            mkdirSync(build.initialOptions.outdir!, { recursive: true });

            cpSync(
              resolve("src/routes/v1/graphql/schema"),
              join(build.initialOptions.outdir!, "schema"),
              {
                recursive: true,
              },
            );
          });
        },
      },
    ],
  },
  constructs: {
    functionPlugin: constructs.functionPlugin,
    restApiProps: constructs.restApiProps,
  },
};
