import "dotenv/config";

import { App } from "aws-cdk-lib";

import { ServicesStack } from "../stacks/services";
import { waitForStackIdle } from "../wait-for-stack-idle";

async function main() {
  const stackName = "peterportal-api-next-services-prod";

  await waitForStackIdle(stackName);

  const app = new App({ autoSynth: true });

  new ServicesStack(app, stackName, {
    env: { region: "us-east-1" },
    terminationProtection: true,
  });
}

main().then();
