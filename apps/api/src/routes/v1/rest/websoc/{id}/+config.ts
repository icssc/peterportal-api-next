import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { ApiPropsOverride } from "@bronya.js/api-construct";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Duration } from "aws-cdk-lib/core";

import { esbuildOptions } from "../../../../../../bronya.config";

export const overrides: ApiPropsOverride = {
  constructs: {
    functionProps: (scope, id) => ({
      role: new Role(scope, `${id}-v1-rest-websoc-id-role`, {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        ],
        inlinePolicies: {
          lambdaInvokePolicy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                  `arn:aws:lambda:${process.env["AWS_REGION"]}:${process.env["ACCOUNT_ID"]}:function:peterportal-api-next-services-prod-websoc-proxy-function`,
                ],
                actions: ["lambda:InvokeFunction"],
              }),
            ],
          }),
        },
      }),
    }),
    functionPlugin: ({ scope, functionProps, handler }) => {
      const warmingTarget = new LambdaFunction(handler, {
        event: RuleTargetInput.fromObject({ body: "warming request" }),
      });

      const warmingRule = new Rule(scope, `${functionProps.functionName}-warming-rule`, {
        schedule: Schedule.rate(Duration.minutes(5)),
      });

      warmingRule.addTarget(warmingTarget);
    },
    lambdaUpload: (directory) => {
      const queryEngines = readdirSync(directory).filter((x) => x.endsWith(".so.node"));

      if (queryEngines.length === 1) {
        return;
      }

      queryEngines
        .filter((x) => x !== "libquery_engine-linux-arm64-openssl-1.0.x.so.node")
        .forEach((queryEngineFile) => {
          rmSync(join(directory, queryEngineFile));
        });
    },
    restApiProps: () => ({ disableExecuteApiEndpoint: true, binaryMediaTypes: ["*/*"] }),
  },
  esbuild: {
    ...esbuildOptions,
    external: process.env.NODE_ENV === "development" ? [] : ["@services/websoc-proxy"],
  },
};
