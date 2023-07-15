import chalk from "chalk";
import { cli, command } from "cleye";
import { consola } from "consola";

import { Api } from "../cdk/constructs/Api";
import { detectConstruct } from "../cdk/index.js";

import { buildApi } from "./commands/build";
import { interactiveCreate } from "./commands/create";
import { deploy } from "./commands/deploy.js";
import { destroy } from "./commands/destroy.js";
import { startApiDevelopmentServer } from "./commands/dev";

async function main() {
  consola.log(chalk("🐜 ant-stack CLI"));

  const argv = cli({
    name: "ant-stack",
    version: "0.1.0",
    commands: [
      command({
        name: "build",
      }),

      command({
        name: "create",
      }),

      command({
        name: "dev",
      }),

      command({
        name: "deploy",
      }),

      command({
        name: "destroy",
      }),
    ],
  });

  const construct = await detectConstruct();

  const isApi = Api.isApi(construct);

  switch (argv.command) {
    case "build": {
      if (isApi) {
        return await buildApi();
      }
      return;
    }

    case "create": {
      return await interactiveCreate();
    }

    case "dev": {
      if (isApi) {
        return await startApiDevelopmentServer(construct);
      }
      return;
    }

    case "deploy": {
      return await deploy();
    }

    case "destroy": {
      return await destroy();
    }
  }
}

main();
