import { ApiPropsOverride } from "@bronya.js/api-construct";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

import { constructs, esbuildOptions } from "../../../../../../bronya.config";

export const overrides: ApiPropsOverride = {
  constructs: {
    ...constructs,
    functionProps: (scope, id, route) => ({
      ...constructs.functionProps?.(scope, id, route),
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
              new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                  `arn:aws:dynamodb:${process.env["AWS_REGION"]}:${process.env["ACCOUNT_ID"]}:table/${id}-cache`,
                ],
                actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
              }),
            ],
          }),
        },
      }),
    }),
  },
  esbuild: {
    ...esbuildOptions,
    external: process.env.NODE_ENV === "development" ? [] : ["@services/websoc-proxy"],
  },
};
