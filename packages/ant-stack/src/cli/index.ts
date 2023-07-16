import chalk from "chalk";
import ci from "ci-info";
import { cli, command } from "cleye";
import { consola } from "consola";

import { Api } from "../cdk/constructs/api";
import { detectConstruct } from "../cdk/index.js";
import { synthesizeConfig } from "../config";

import { buildApi } from "./commands/build";
import { interactiveCreate } from "./commands/create";
import { deployGitHub } from "./commands/deploy";
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

  /**
   * FIXME: the app is initialized once and prop-drilled everywhere.
   */
  const app = await synthesizeConfig();

  const construct = await detectConstruct(app);

  const isApi = Api.isApi(construct);

  const isGitHubPr = ci.isCI && ci.GITHUB_ACTIONS && ci.isPR;

  switch (argv.command) {
    case "build": {
      if (isApi) {
        return await buildApi(app);
      }

      consola.error(`💀 Unsupported constructs`);
      return;
    }

    case "create": {
      return await interactiveCreate();
    }

    case "dev": {
      if (isApi) {
        return await startApiDevelopmentServer(construct);
      }
      consola.error(`💀 Unsupported development server.`);
      return;
    }

    case "deploy": {
      if (isGitHubPr) {
        return await deployGitHub(app);
      }
      consola.error(`💀 Unsupported CI/CD environment.`);
      return;
    }

    case "destroy": {
      return await destroy(app);
    }
  }
}

main();
