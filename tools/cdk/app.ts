#!/usr/bin/env node
import "dotenv/config";

import type { StackProps } from "aws-cdk-lib";
import { App } from "aws-cdk-lib";

import { UnifiedScraperStack } from "./UnifiedScraperStack";
import { WebsocScraperV2Stack } from "./WebsocScraperV2Stack";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: true,
};

new UnifiedScraperStack(app, "peterportal-api-next-unified-scraper-stack-prod", props);
new WebsocScraperV2Stack(app, "peterportal-api-next-websoc-scraper-v2-prod", props);
