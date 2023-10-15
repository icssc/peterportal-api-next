import { chmodSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Api, ApiConstructProps } from "@bronya.js/api-construct";
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
import { config } from "dotenv";
import type { BuildOptions } from "esbuild";

/**
 * Whether or not we're executing in CDK.
 *
 * During development (not in CDK) ...
 * - Bronya is responsible for handling the development server.
 * - The exported `main` function is imported and then called to get the CDK app.
 * - No AWS constructs are actually allocated, since this requires certain files to be built that
 *   may not exist during development.
 *
 * During deployment (in CDK) ...
 * - The `cdk` CLI tool is responsible for deploying the CloudFormation stack.
 * - The CLI expects the app to be created at the top level,
 *   so the main function is also called immediately after its declaration.
 * - All the AWS constructs are allocated, and relevant transformations are applied before
 *   uploading the code via AWS CloudFormation.
 */
const executingInCdk = isCdk();

config({
  path: "../../.env",
});

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

/**
 * Where all Prisma related files are located.
 */
const prismaClientDirectory = resolve(libsDbDirectory, "node_modules", "prisma");

/**
 * Name of the schema file.
 */
const prismaSchemaFile = "schema.prisma";

/**
 * Where the prisma schema is located.
 */
const prismaSchema = resolve(libsDbDirectory, "prisma", prismaSchemaFile);

/**
 * Name of the Prisma query engine file that's used on AWS Lambda.
 */
const prismaQueryEngineFile = "libquery_engine-linux-arm64-openssl-1.0.x.so.node";

/**
 * The body of a warming request.
 *
 * TODO: actually recognize warming requests in the route handlers.
 */
const warmingRequestBody = { body: "warming request" };

/**
 * Shared ESBuild options.
 */
export const esbuildOptions: BuildOptions = {
  format: "esm",
  platform: "node",
  bundle: true,
  minify: true,
  banner: { js },

  /**
   * @remarks
   * For Fourmilier: this is specified in order to guarantee that the file is interprested as ESM.
   * However, the framework will continue to assume `handler.js` is the entrypoint.
   *
   * @RFC What would be the best way to resolve these two values?
   */
  outExtension: { ".js": ".mjs" },
};

/**
 * Shared construct props.
 */
export const constructs: ApiConstructProps = {
  functionPlugin: ({ functionProps, handler }, scope) => {
    const warmingTarget = new LambdaFunction(handler, {
      event: RuleTargetInput.fromObject(warmingRequestBody),
    });

    const warmingRule = new Rule(scope, `${functionProps.functionName}-warming-rule`, {
      schedule: Schedule.rate(Duration.minutes(5)),
    });

    warmingRule.addTarget(warmingTarget);
  },
  lambdaUpload: (directory) => {
    copyFileSync(
      join(prismaClientDirectory, prismaQueryEngineFile),
      join(directory, prismaQueryEngineFile),
    );

    chmodSync(join(directory, prismaQueryEngineFile), 0o755);

    copyFileSync(prismaSchema, join(directory, prismaSchemaFile));
  },
  restApiProps: () => ({ disableExecuteApiEndpoint: true, binaryMediaTypes: ["*/*"] }),
};

/**
 * The backend API stack. i.e. AWS Lambda, API Gateway.
 */
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

      /**
       * @remarks
       * For Fourmilier: although ESBuild specified that "js" -> "mjs", the framework
       * still assumes that the entrypoint is `handler.js` unless explicitly specified.
       */
      exitPoint: "handler.mjs",

      constructs,
      environment: {
        DATABASE_URL: process.env["DATABASE_URL"] ?? "",
        NODE_ENV: process.env["NODE_ENV"] ?? "",
        STAGE: stage,
      },
      esbuild: esbuildOptions,
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

/**
 * Bronya requires a default export or exported named `main` function that returns an {@link App}
 * in order to support development functionality.
 */
export async function main(): Promise<App> {
  const id = "peterportal-api-next";

  const zoneName = "peterportal.org";

  const app = new App();

  const stage = getStage();

  const stack = new ApiStack(app, `${id}-${stage}`, stage);

  await stack.api.init();

  // In development mode, return the app so that Bronya can handle the development server.
  // The app is not synthesized, and no AWS resources are allocated.
  if (!executingInCdk) {
    return app;
  }

  if (stage === "dev") {
    throw new Error("Cannot deploy this app in the development environment.");
  }

  // In deployment mode, synthesize all the AWS resources.
  const synthesized = await stack.api.synth();

  /**
   * Add gateway responses for 5xx and 404 errors, so that they remain compliant
   * with the {@link `ErrorResponse`} type.
   */
  synthesized.api.addGatewayResponse(`${id}-${stage}-5xx`, {
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

  synthesized.api.addGatewayResponse(`${id}-${stage}-404`, {
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

  /**
   * Define the CORS response headers integration and add it to all endpoints.
   * This is necessary since we hacked API Gateway to be able to serve binary data.
   */
  const corsIntegration = new LambdaIntegration(
    new AwsLambdaFunction(synthesized.api, `${id}-${stage}-options-handler`, {
      code: Code.fromInline(
        // language=JavaScript
        'exports.h=async _=>({headers:{"Access-Control-Allow-Origin": "*","Access-Control-Allow-Headers": "Apollo-Require-Preflight,Content-Type","Access-Control-Allow-Methods": "GET,POST,OPTIONS"},statusCode:204})',
      ),
      handler: "index.h",
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
    }),
  );

  synthesized.api.methods.forEach((apiMethod) => {
    try {
      apiMethod.resource.addMethod("OPTIONS", corsIntegration);
    } catch {
      // no-op
    }
  });

  // Set up the custom domain name and A record for the API.
  synthesized.api.addDomainName(`${id}-${stage}-domain`, {
    domainName: `${stage === "prod" ? "" : `${stage}.`}api-next.peterportal.org`,
    certificate: Certificate.fromCertificateArn(
      synthesized.api,
      "peterportal-cert",
      process.env.CERTIFICATE_ARN ?? "",
    ),
  });

  new ARecord(synthesized.api, `${id}-${stage}-a-record`, {
    zone: HostedZone.fromHostedZoneAttributes(synthesized.api, "peterportal-hosted-zone", {
      zoneName,
      hostedZoneId: process.env.HOSTED_ZONE_ID ?? "",
    }),
    recordName: `${stage === "prod" ? "" : `${stage}.`}api-next`,
    target: RecordTarget.fromAlias(new ApiGateway(synthesized.api)),
  });

  return app;
}

if (executingInCdk) {
  // Sike, looks like even though we have top-level await, the dev server won't start with it :(
  main().then();
}
