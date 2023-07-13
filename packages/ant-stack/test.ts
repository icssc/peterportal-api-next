import path from "node:path";

import createJITI from "jiti";

import { Api } from "./src/cdk/constructs/Api";

async function main() {
  const jiti = createJITI(path.resolve(), {
    interopDefault: true,
    cache: false,
    v8cache: false,
    esmResolve: true,
    requireCache: false,
  });

  const configModule = jiti("../../ant.config.ts");

  const app = await configModule.default();

  const api = app.node.children[0].node.children[0];

  console.log(Api.isApi(api));

  console.log(api);
}

main();
