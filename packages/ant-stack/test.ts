import { Stack } from "aws-cdk-lib";

import { Api } from "./src/cdk/constructs/Api";
import { initConfig } from "./src/config.js";

async function main() {
  const app = await initConfig();

  /**
   * TODO: handle multiple stacks.
   */
  const stacks = app.node.children.find(Stack.isStack);

  if (!stacks) {
    throw new Error(`No stacks found.`);
  }

  /**
   * TODO: handle multiple APIs.
   */
  const api = stacks?.node.children.find(Api.isApi);

  if (!api) {
    throw new Error(`No API construct found.`);
  }

  return api;
}

main();
