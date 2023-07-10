import chalk from "chalk";
import { cli, command } from "cleye";
import { consola } from "consola";

import { buildInternalHandler } from "./commands/build.js";
import { interactiveCreate } from "./commands/create";
import { deploy } from "./commands/deploy.js";
import { startDevServer } from "./commands/dev.js";

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
    ],
  });

  switch (argv.command) {
    case "build": {
      return await buildInternalHandler();
    }
    case "create": {
      return await interactiveCreate();
    }
    case "dev": {
      return await startDevServer();
    }
    case "deploy": {
      return await deploy();
    }
  }
}

main();
