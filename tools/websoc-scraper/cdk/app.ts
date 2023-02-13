#!/usr/bin/env node
import "dotenv/config";

import { App } from "aws-cdk-lib";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const app = new App({ autoSynth: true });
const invokePolicy = new PolicyStatement({
  resources: [
    "peterportal-api-next-websoc-scraper-main",
    "peterportal-api-next-websoc-scraper-parent",
  ],
  actions: ["lambda:InvokeFunction"],
});
const ddbAccessPolicy = new PolicyStatement({
  resources: ["peterportal-api-next-websoc-*"],
  actions: [
    "dynamodb:CreateTable",
    "dynamodb:DescribeTable",
    "dynamodb:PutItem",
  ],
});
const lambdaServicePrincipal = new ServicePrincipal("lambda.amazonaws.com");
const mainRole = new Role(
  app,
  "peterportal-api-next-websoc-scraper-main-role",
  {
    assumedBy: lambdaServicePrincipal,
  }
);
mainRole.addToPolicy(invokePolicy);
const parentRole = new Role(
  app,
  "peterportal-api-next-websoc-scraper-parent-role",
  {
    assumedBy: lambdaServicePrincipal,
  }
);
parentRole.addToPolicy(invokePolicy);
parentRole.addToPolicy(ddbAccessPolicy);
const childRole = new Role(
  app,
  "peterportal-api-next-websoc-scraper-child-role",
  {
    assumedBy: lambdaServicePrincipal,
  }
);
childRole.addToPolicy(ddbAccessPolicy);
for (const [name, role] of Object.entries({
  main: mainRole,
  parent: parentRole,
  child: childRole,
})) {
  new Function(app, `peterportal-api-next-websoc-scraper-${name}`, {
    runtime: Runtime.NODEJS_16_X,
    code: Code.fromAsset(
      join(dirname(fileURLToPath(import.meta.url)), `../dist/${name}.js`)
    ),
    handler: `${name}.handler`,
    role,
  });
}
