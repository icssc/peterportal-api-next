import chalk from "chalk";
import { cli, command } from "cleye";
import { consola } from "consola";
import { defu } from "defu";

import { buildInternalHandler } from "./commands/build.js";
import { automaticCreate, CreateOptions, interactiveCreate } from "./commands/create.js";
import { startDevServer } from "./commands/dev.js";

async function start() {
  consola.log(chalk.green.bgRedBright(`PPA - PeterPortal API core CLI tool`));

  const argv = cli({
    name: "ppa",

    version: "0.69.420",

    commands: [
      command({
        name: "create",
        parameters: ["[endpoint]"],
        flags: {
          interactive: {
            type: Boolean,
            alias: "i",
            description: "Interactively create a new endpoint",
          },
          methods: {
            type: [String],
          },
        },
      }),

      command({
        name: "dev",
      }),

      command({
        name: "build",
      }),
    ],
  });

  switch (argv.command) {
    case "create": {
      if (argv.flags.interactive) {
        return await interactiveCreate();
      }

      const createOptions = CreateOptions(defu(argv.flags, argv._));

      if (!createOptions.data) {
        consola.error(chalk.redBright(createOptions.problems));
        return;
      }

      return await automaticCreate(createOptions.data);
    }

    case "build": {
      return await buildInternalHandler();
    }

    case "dev": {
      return await startDevServer();
    }
  }
}

start();

export * from "./commands/build.js";
export * from "./commands/create.js";
export * from "./commands/dev.js";
