/**
 * Bruh, using the {@link defineConfig} helper makes {@link loadConfig} take so much longer!!
 * (JITI has to just-in-time compile __ALL__ the TypeScript)
 * import { defineConfig } from 'peterportal-api-sst'
 * export default defineConfig({ ... })
 */
import type { AntConfig, defineConfig } from "ant-stack/config";
import type { loadConfig } from "unconfig";

import env from "./env.js";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;

export const inDir = "./src";
export const outDir = "./dist";
export const entryFileName = "index";

/**
 * Just using types is a lot faster!!
 */
const config: AntConfig = {
  packageManager: "pnpm",
  port: 8080,
  aws: {
    id: "peterportal-api-next",
    zoneName: "peterportal.org",
    routeRolePropsMapping: {
      "v1-rest-websoc": {
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
  },
  env,
  directory: "apps/api",
  esbuild: {
    entryPoints: [`${inDir}/${entryFileName}.ts`],
    external: ["@aws-sdk/client-lambda"],
    outdir: outDir,
    platform: "node",
    format: "esm",
    target: "esnext",
    bundle: true,
    minify: true,
    assetNames: "[name]",
    loader: {
      ".env": "copy",
    },
    banner: { js },
  },
  runtime: {
    entryFile: `${entryFileName}.js`,
    entryHandlersName: "InternalHandlers",
    lambdaCoreFile: "lambda-core.js",
    nodeRuntimeFile: "lambda-node-runtime.js",
    bunRuntimeFile: "lambda-bun-runtime.js",
  },
};

export default config;
