#!/usr/bin/env node
import "dotenv/config";

import type { StackProps } from "aws-cdk-lib";
import { App } from "aws-cdk-lib";

import { WebsocProxyServiceStack } from "./websocProxyServiceStack";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: true,
};

new WebsocProxyServiceStack(app, "peterportal-api-next-websoc-proxy-service-prod", props);
