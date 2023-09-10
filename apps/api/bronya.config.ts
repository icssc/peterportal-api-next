import fs from "node:fs";
import path from "node:path";
import { App, Stack, Duration } from "aws-cdk-lib/core";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { RuleTargetInput, Rule, Schedule } from "aws-cdk-lib/aws-events";
import { isCdk } from "@bronya.js/core";
import { Api } from "@bronya.js/api-construct";
import { createApiCliPlugins } from "@bronya.js/api-construct/plugins/cli";
import { logger } from "@libs/lambda";
import { EndpointType, LambdaIntegration, ResponseType } from "aws-cdk-lib/aws-apigateway";
import { Architecture, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1623640043
 */
// language=JavaScript
const js = `
  import topLevelModule from "node:module";
  import topLevelUrl from "node:url";
  import topLevelPath from "node:path";

  const require = topLevelModule.createRequire(import.meta.url);
  const __filename = topLevelUrl.fileURLToPath(import.meta.url);
  const __dirname = topLevelPath.dirname(__filename);
`;

const projectRoot = process.cwd();

/**
 * Where @libs/db is located.
 */
const libsDbDirectory = path.resolve(projectRoot, "..", "..", "libs", "db");

const prismaClientDirectory = path.resolve(libsDbDirectory, "node_modules", "prisma");

const prismaSchema = path.resolve(libsDbDirectory, "prisma", "schema.prisma");

class ApiStack extends Stack {
  public api: Api;
  constructor(scope: App, id: string, stage: string) {
    super(scope, id);

    this.api = new Api(this, `${id}-api`, {
      directory: "src/routes",
      plugins: createApiCliPlugins({
        dev: {
          hooks: {
            transformExpressParams: ({ req }) => {
              logger.info(`Path params: ${JSON.stringify(req.params)}`);
              logger.info(`Query: ${JSON.stringify(req.query)}`);
              logger.info(`Body: ${JSON.stringify(req.body)}`);
              logger.info(`Referer: ${req.headers.referer}`);
            },
          },
        },
      }),
      exitPoint: "handler.mjs",
      constructs: {
        functionPlugin: ({ functionProps, handler }) => {
          const warmingTarget = new LambdaFunction(handler, {
            event: RuleTargetInput.fromObject({ body: "warming request" }),
          });

          const warmingRule = new Rule(this, `${functionProps.functionName}-warming-rule`, {
            schedule: Schedule.rate(Duration.minutes(5)),
          });

          warmingRule.addTarget(warmingTarget);
        },
        lambdaUpload: (directory) => {
          const queryEngines = fs.readdirSync(directory).filter((x) => x.endsWith(".so.node"));

          if (queryEngines.length === 1) {
            return;
          }

          queryEngines
            .filter((x) => x !== "libquery_engine-linux-arm64-openssl-1.0.x.so.node")
            .forEach((queryEngineFile) => {
              fs.rmSync(path.join(directory, queryEngineFile));
            });
        },
        restApiProps: (scope) => ({
          domainName: {
            domainName: `${stage === "prod" ? "" : `${stage}.`}api-next.peterportal.org`,
            certificate: Certificate.fromCertificateArn(
              scope,
              "peterportal-cert",
              process.env.CERTIFICATE_ARN ?? "",
            ),
          },
          disableExecuteApiEndpoint: true,
          endpointTypes: [EndpointType.EDGE],
          binaryMediaTypes: ["*/*"],
          restApiName: `${id}-${stage}`,
        }),
      },
      environment: {
        DATABASE_URL: process.env["DATABASE_URL"] ?? "",
        NODE_ENV: process.env["NODE_ENV"] ?? "",
        STAGE: stage,
      },
      esbuild: {
        format: "esm",
        platform: "node",
        bundle: true,
        minify: true,
        banner: { js },
        outExtension: { ".js": ".mjs" },
        plugins: [
          {
            name: "copy-graphql-schema",
            setup(build) {
              build.onStart(async () => {
                if (!build.initialOptions.outdir?.endsWith("graphql")) return;

                fs.mkdirSync(build.initialOptions.outdir, { recursive: true });

                fs.cpSync(
                  path.resolve(projectRoot, "src/routes/v1/graphql/schema"),
                  path.join(build.initialOptions.outdir, "schema"),
                  { recursive: true },
                );
              });
            },
          },
          {
            name: "copy-prisma",
            setup(build) {
              build.onStart(async () => {
                const outDirectory = build.initialOptions.outdir ?? projectRoot;

                fs.mkdirSync(outDirectory, { recursive: true });

                const queryEngines = fs
                  .readdirSync(prismaClientDirectory)
                  .filter((file) => file.endsWith(".so.node"));

                queryEngines.forEach((queryEngineFile) =>
                  fs.copyFileSync(
                    path.join(prismaClientDirectory, queryEngineFile),
                    path.join(outDirectory, queryEngineFile),
                  ),
                );

                queryEngines.forEach((queryEngineFile) =>
                  fs.chmodSync(path.join(outDirectory, queryEngineFile), 0o755),
                );

                fs.copyFileSync(prismaSchema, path.join(outDirectory, "schema.prisma"));
              });
            },
          },
        ],
      },
    });
  }
}

export async function main() {
  const id = "peterportal-api-next";

  const app = new App();

  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV not set.");
  }

  let stage;

  switch (process.env.NODE_ENV) {
    case "production":
      stage = "prod";
      break;
    case "staging":
      if (!process.env.PR_NUM) {
        throw new Error("NODE_ENV was set to staging, but a PR number was not provided.");
      }
      stage = `staging-${process.env.PR_NUM}`;
      break;
    case "development":
      stage = "dev";
      break;
    default:
      throw new Error(
        "Invalid NODE_ENV specified. Valid values are 'production', 'staging', and 'development'.",
      );
  }

  const stack = new ApiStack(app, id, stage);

  const api = stack.api;

  await api.init();

  if (isCdk()) {
    if (stage === "dev") {
      throw new Error("Cannot deploy this app in the development environment.");
    }
    const result = await api.synth();

    result.api.addGatewayResponse(`${id}-${stage}-5xx`, {
      type: ResponseType.DEFAULT_5XX,
      statusCode: "500",
      templates: {
        "application/json": JSON.stringify({
          timestamp: "$context.requestTime",
          requestId: "$context.requestId",
          statusCode: 500,
          error: "Internal Server Error",
          message: "An unknown error has occurred. Please try again.",
        }),
      },
    });

    result.api.addGatewayResponse(`${id}-${stage}-404`, {
      type: ResponseType.MISSING_AUTHENTICATION_TOKEN,
      statusCode: "404",
      templates: {
        "application/json": JSON.stringify({
          timestamp: "$context.requestTime",
          requestId: "$context.requestId",
          statusCode: 404,
          error: "Not Found",
          message: "The requested resource could not be found.",
        }),
      },
    });

    const optionsIntegration = new LambdaIntegration(
      new lambda.Function(result.api, `${id}-options-handler`, {
        code: Code.fromInline(
          // language=JavaScript
          'exports.h=async _=>({body:"",headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Apollo-Require-Preflight,Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"},statusCode:204});',
        ),
        handler: "index.h",
        runtime: Runtime.NODEJS_18_X,
        architecture: Architecture.ARM_64,
      }),
    );

    result.api.methods.forEach((x) => {
      try {
        x.resource.addMethod("OPTIONS", optionsIntegration);
      } catch {
        // no-op
      }
    });
  }

  return app;
}

if (isCdk()) {
  main().then();
}
