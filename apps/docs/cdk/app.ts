#!/usr/bin/env node
import "dotenv/config";

import { App } from "aws-cdk-lib";

import { DocsStack } from "./docsStack";

// Instantiate the CDK app and the documentation stack.

const app = new App({ autoSynth: true });
new DocsStack(app, "peterportal-api-next-docs");
