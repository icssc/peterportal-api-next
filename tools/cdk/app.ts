#!/usr/bin/env node
import "dotenv/config";

import { App, StackProps } from "aws-cdk-lib";

import { WebsocScraperStack } from "./websocScraperStack.js";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: /* true */ false,
};
new WebsocScraperStack(app, "peterportal-api-next-websoc-scraper-stack", props);
