import fs from "node:fs";
import path from "node:path";
import { App, Stack, Duration } from "aws-cdk-lib/core";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { RuleTargetInput, Rule, Schedule } from "aws-cdk-lib/aws-events";
import { isCdk } from "@bronya.js/core";
import { Api } from "@bronya.js/api-construct";
import { createApiCliPlugins } from "@bronya.js/api-construct/plugins/cli";
import { logger } from "@libs/lambda";

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

class MyStack extends Stack {
  public api: Api;
  constructor(scope: App, id: string) {
    super(scope, id);

    this.api = new Api(this, `${id}-api`, {
      directory: "src/routes",
      plugins: createApiCliPlugins({
        dev: {
          hooks: {
            transformExpressParams(params) {
              const { req } = params;
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
        functionPlugin(functionResources) {
          const { functionProps, handler } = functionResources;

          const warmingTarget = new LambdaFunction(handler, {
            event: RuleTargetInput.fromObject({ body: "warming request" }),
          });

          const warmingRule = new Rule(scope, `${id}-${functionProps.functionName}-warming-rule`, {
            schedule: Schedule.rate(Duration.minutes(5)),
          });

          warmingRule.addTarget(warmingTarget);
        },
        lambdaUpload(directory) {
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
      },
      environment: { DATABASE_URL: process.env["DATABASE_URL"] ?? "" },
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
  const app = new App();

  const stack = new MyStack(app, "peterportal-api-canary");

  const api = stack.api;

  await api.init();

  if (isCdk()) {
    const result = await api.synth();

    result.api.addGatewayResponse;

    result.functions;
  }

  return app;
}

if (isCdk()) {
  main();
}
