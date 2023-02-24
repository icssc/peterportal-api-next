#!/usr/bin/env node
import "dotenv/config";

import { App } from "aws-cdk-lib";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

import { ApiStack } from "./apiStack.js";

// Instantiate the CDK app and the API stack.

const app = new App({ autoSynth: true });
const api = new ApiStack(app, "peterportal-api-next");

// To add new routes, insert additional api.addRoute calls below this comment.
// You should not need to touch anything else in this file,
// or any other file in this directory.
api.addRoute(
  "/v1/rest/websoc",
  "websoc",
  new Role(api, "peterportal-api-next-websoc-cache-updater-role", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      ),
    ],
    inlinePolicies: {
      ddbPutPolicy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              "arn:aws:lambda:::function:peterportal-api-next-websoc-cache-updater",
            ],
            actions: ["lambda:InvokeFunction"],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              "arn:aws:dynamodb:::table/peterportal-api-next-websoc-cache",
            ],
            actions: ["dynamodb:PutItem"],
          }),
        ],
      }),
    },
  })
);
