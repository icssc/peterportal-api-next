#!/usr/bin/env node
import "dotenv/config";

import { App, StackProps } from "aws-cdk-lib";

import { WebsocCacheUpdaterStack } from "./websocCacheUpdaterStack.js";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: /* true */ false,
};
new WebsocCacheUpdaterStack(
  app,
  "peterportal-api-next-websoc-cache-updater-stack",
  props
);
