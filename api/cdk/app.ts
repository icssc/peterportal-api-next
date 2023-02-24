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
  new Role(api, "peterportal-api-next-websoc-route-role", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      ),
    ],
    inlinePolicies: {
      ddbQueryPolicy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:dynamodb:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:table/peterportal-api-next-websoc-cache`,
            ],
            actions: ["dynamodb:Query"],
          }),
        ],
      }),
      lambdaInvokePolicy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:function:peterportal-api-next-websoc-cache-updater`,
            ],
            actions: ["lambda:InvokeFunction"],
          }),
        ],
      }),
    },
  })
);
