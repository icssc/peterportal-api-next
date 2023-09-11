import { chmodSync, copyFileSync, cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import { Api } from "@bronya.js/api-construct";
import { createApiCliPlugins } from "@bronya.js/api-construct/plugins/cli";
import { isCdk } from "@bronya.js/core";
import { logger } from "@libs/lambda";
import { LambdaIntegration, ResponseType } from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { RuleTargetInput, Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Architecture, Code, Function as AwsLambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import { App, Stack, Duration } from "aws-cdk-lib/core";

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
const libsDbDirectory = resolve(projectRoot, "..", "..", "libs", "db");

const prismaClientDirectory = resolve(libsDbDirectory, "node_modules", "prisma");

const prismaSchema = resolve(libsDbDirectory, "prisma", "schema.prisma");

class ApiStack extends Stack {
  public api: Api;
  constructor(scope: App, id: string, stage: string) {
    super(scope, id);

    this.api = new Api(this, id, {
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

                mkdirSync(build.initialOptions.outdir, { recursive: true });

                cpSync(
                  resolve(projectRoot, "src/routes/v1/graphql/schema"),
                  join(build.initialOptions.outdir, "schema"),
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

                if (outDirectory.endsWith("graphql")) return;

                mkdirSync(outDirectory, { recursive: true });

                const queryEngines = readdirSync(prismaClientDirectory).filter((file) =>
                  file.endsWith(".so.node"),
                );

                queryEngines.forEach((queryEngineFile) =>
                  copyFileSync(
                    join(prismaClientDirectory, queryEngineFile),
                    join(outDirectory, queryEngineFile),
                  ),
                );

                queryEngines.forEach((queryEngineFile) =>
                  chmodSync(join(outDirectory, queryEngineFile), 0o755),
                );

                copyFileSync(prismaSchema, join(outDirectory, "schema.prisma"));
              });
            },
          },
        ],
      },
    });
  }
}

function getStage() {
  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV not set.");
  }
  switch (process.env.NODE_ENV) {
    case "production":
      return "prod";
    case "staging":
      if (!process.env.PR_NUM) {
        throw new Error("NODE_ENV was set to staging, but a PR number was not provided.");
      }
      return `staging-${process.env.PR_NUM}`;
    case "development":
      return "dev";
    default:
      throw new Error(
        "Invalid NODE_ENV specified. Valid values are 'production', 'staging', and 'development'.",
      );
  }
}

export async function main() {
  const id = "peterportal-api-next";

  const zoneName = "peterportal.org";

  const app = new App();

  const stage = getStage();

  const stack = new ApiStack(app, `${id}-${stage}`, stage);

  const api = stack.api;

  await api.init();

  if (isCdk()) {
    if (stage === "dev") {
      throw new Error("Cannot deploy this app in the development environment.");
    }

    const result = await api.synth();

    const responseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Apollo-Require-Preflight,Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };

    /**
     * Add gateway responses for 5xx and 404 errors, so that they remain compliant
     * with the {@link `ErrorResponse`} type.
     */
    result.api.addGatewayResponse(`${id}-${stage}-5xx`, {
      type: ResponseType.DEFAULT_5XX,
      statusCode: "500",
      responseHeaders,
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
      responseHeaders,
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

    /**
     * Define the CORS response headers integration and add it to all endpoints.
     * This is necessary since we hacked API Gateway to be able to serve binary data.
     */
    const corsIntegration = new LambdaIntegration(
      new AwsLambdaFunction(result.api, `${id}-${stage}-options-handler`, {
        code: Code.fromInline(
          // language=JavaScript
          `exports.h=async _=>({body:"",headers:${JSON.stringify(responseHeaders)});`,
        ),
        handler: "index.h",
        runtime: Runtime.NODEJS_18_X,
        architecture: Architecture.ARM_64,
      }),
    );
    result.api.methods.forEach((apiMethod) => {
      try {
        apiMethod.resource.addMethod("OPTIONS", corsIntegration);
      } catch {
        // no-op
      }
    });

    // Set up the custom domain name and A record for the API.
    result.api.addDomainName(`${id}-${stage}-domain`, {
      domainName: `${stage === "prod" ? "" : `${stage}.`}api-next.peterportal.org`,
      certificate: Certificate.fromCertificateArn(
        result.api,
        "peterportal-cert",
        process.env.CERTIFICATE_ARN ?? "",
      ),
    });
    new ARecord(result.api, `${id}-${stage}-a-record`, {
      zone: HostedZone.fromHostedZoneAttributes(result.api, "peterportal-hosted-zone", {
        zoneName,
        hostedZoneId: process.env.HOSTED_ZONE_ID ?? "",
      }),
      recordName: `${stage === "prod" ? "" : `${stage}.`}api-next`,
      target: RecordTarget.fromAlias(new ApiGateway(result.api)),
    });
  }

  return app;
}

if (isCdk()) {
  // Sike, looks like even though we have top-level await, the dev server won't start with it :(
  main().then();
}
