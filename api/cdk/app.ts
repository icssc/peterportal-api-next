#!/usr/bin/env node
import "dotenv/config";

import { App } from "aws-cdk-lib";

import { ApiStack } from "./apiStack.js";

// Instantiate the CDK app and the API stack.

const app = new App({ autoSynth: true });
const api = new ApiStack(app, "peterportal-api-next");

// To add new routes, insert additional api.addRoute calls below this comment.
// You should not need to touch anything else in this file,
// or any other file in this directory.
api.addRoute("/v1/graphql", "graphql");
api.addRoute("/v1/rest/grades/{id}", "grades");
api.addRoute("/v1/rest/websoc", "websoc");
api.addRoute("/v1/rest/larc", "larc");
