import "dotenv/config";

import { App } from "aws-cdk-lib";

import { DocsStack } from "../stacks/docs";
import { waitForStackIdle } from "../wait-for-stack-idle";

function getStage() {
  switch (process.env.NODE_ENV) {
    case "production": {
      return "prod";
    }

    case "staging": {
      if (!process.env.PR_NUM) {
        throw new Error("Running in staging environment but no PR number specified. Stop.");
      }
      return `staging-${process.env.PR_NUM}`;
    }

    case "development": {
      throw new Error("Cannot deploy stack in development environment. Stop.");
    }

    default: {
      throw new Error("Invalid environment specified. Stop.");
    }
  }
}

async function main() {
  const stage = getStage();

  const stackName = `peterportal-api-next-docs-${stage}`;

  await waitForStackIdle(stackName);

  const app = new App({ autoSynth: true });

  new DocsStack(app, stackName, {
    stage,
    env: {
      region: "us-east-1",
    },
    terminationProtection: /*stage === "prod"*/ false,
  });
}

main();
