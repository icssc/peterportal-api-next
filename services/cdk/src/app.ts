import "dotenv/config";

import { App } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";

import { ServicesStack } from "./stack";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: true,
};

new ServicesStack(app, "peterportal-api-next-services-prod", props);
