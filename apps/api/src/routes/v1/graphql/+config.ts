import { cpSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { ApiPropsOverride } from "@bronya.js/api-construct";

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

export const overrides: ApiPropsOverride = {
  esbuild: {
    format: "esm",
    platform: "node",
    bundle: true,
    minify: true,
    banner: { js },
    outExtension: { ".js": ".mjs" },
    plugins: [
      {
        name: "copy-graphql-schema",
        setup(build) {
          build.onStart(async () => {
            if (!build.initialOptions.outdir?.endsWith("graphql")) return;

            mkdirSync(build.initialOptions.outdir, { recursive: true });

            cpSync(resolve("./schema"), join(build.initialOptions.outdir, "schema"), {
              recursive: true,
            });
          });
        },
      },
    ],
  },
};
