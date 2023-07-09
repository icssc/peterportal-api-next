import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AntConfigStub } from "ant-stack/config";
import env from "../../../../../env.js";

import { cleanCopy, selectDelete } from "@libs/build-tools";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url));

// The relative path to the generated Prisma Client.
const prismaClientDir = "./node_modules/@libs/db/node_modules/prisma";

const prismaSchema = "./node_modules/@libs/db/prisma/schema.prisma";

const outDir = resolve(cwd, "./dist");

const config: AntConfigStub = {
  aws: {
    routeRoleProps: {
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
                `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:function:peterportal-api-next-prod-websoc-proxy-service`,
              ],
              actions: ["lambda:InvokeFunction"],
            }),
          ],
        }),
      },
    },
  },
  esbuild: {
    plugins: [
      cleanCopy(cwd, outDir, prismaClientDir, prismaSchema),
      selectDelete(env.NODE_ENV, outDir),
    ],
  },
};

export default config;
