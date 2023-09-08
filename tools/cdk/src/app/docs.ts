import "dotenv/config";

import { App } from "aws-cdk-lib";

import { DocsStack } from "../stacks/docs";

async function main() {
  const app = new App({ autoSynth: true });

  new DocsStack(app, "peterportal-api-next-docs");
}

main();
