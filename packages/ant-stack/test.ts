import path from "node:path";

import type { Construct } from "constructs";
import createJITI from "jiti";

import { Api } from "./src/cdk/constructs/Api.js";
import { SsrSite } from "./src/cdk/constructs/SsrSite.js";
import { StaticSite } from "./src/cdk/constructs/StaticSite.js";

type AnyConstruct = Construct | StaticSite | SsrSite | Api;

async function main() {
  const jiti = createJITI(path.resolve(), {
    interopDefault: true,
    cache: false,
    v8cache: false,
    esmResolve: true,
    requireCache: false,
  });

  const program = jiti("./src/ant.config");
  const main = program.default;
  const app: Construct = main();

  const children = app.node.children as AnyConstruct[];

  children.forEach((child) => {
    if (!("type" in child)) {
      return;
    }

    switch (child.type) {
      case "ssr-site":
        console.log("is ssr site: ", child);
        break;

      case "static-site":
        console.log("is static site: ", child);
        break;

      case "api":
        console.log("is api: ", child);
        break;
    }
  });
}

main();
