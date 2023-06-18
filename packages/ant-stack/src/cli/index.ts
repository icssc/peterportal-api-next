import chalk from "chalk";
import { cli, command } from "cleye";
import { consola } from "consola";

import { buildInternalHandler } from "./commands/build.js";
import { interactiveCreate } from "./commands/create";
import { deploy } from "./commands/deploy";
import { startDevServer } from "./commands/dev.js";

async function start() {
  consola.log(chalk("🐜 The ant-stack command-line tool"));

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
        name: "deploy",
      }),

      command({
        name: "dev",
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
    case "deploy": {
      return await deploy();
    }
    case "dev": {
      return await startDevServer();
    }
  }
}

start();
