/**
 * IMPORTANT: we can't import the entirety of aws-cdk-lib because it will nuke our memory when we JIT execute!
 *
 * NOO! 🤬
 * ```ts
 * import * as cdk from 'aws-cdk-lib'
 * ```
 */

import path from "node:path";
import { consola } from "consola";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as aws_core from "aws-cdk-lib/core";
import * as aws_certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as aws_cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as aws_cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as aws_route53 from "aws-cdk-lib/aws-route53";
import * as aws_route53_targets from "aws-cdk-lib/aws-route53-targets";
import { Api } from "ant-stack/constructs/api";
import { GitHub } from "ant-stack/constructs/github";
import { StaticSite } from "ant-stack/constructs/staticSite";
import { getWorkspaceRoot } from "ant-stack/utils";
import { isCdk } from "ant-stack/config";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelModule from 'node:module';
import topLevelPath from 'node:path'
import topLevelUrl from 'node:url'

const require = topLevelModule.createRequire(import.meta.url);
const __filename = topLevelUrl.fileURLToPath(import.meta.url);
const __dirname = topLevelPath.dirname(__filename);
`;

export class ApiStack extends aws_core.Stack {
  api: Api;

  constructor(scope: aws_core.App, id: string) {
    super(scope, id, {
      env: {
        region: "us-east-1",
      },
      terminationProtection: /*stage === "prod"*/ false,
    });

    this.api = new Api(this, "Api", {
      directory: "apps/api",
      constructs: {},
      runtime: {
        esbuild: {
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
      },
    });
  }
}

export class DocsStack extends aws_core.Stack {
  staticSite: StaticSite = Object.create(null);

  cloudFrontTarget: aws_route53_targets.CloudFrontTarget = Object.create(null);

  aRecord: aws_route53.ARecord = Object.create(null);

  zone: aws_route53.IHostedZone = Object.create(null);

  stage: string;

  constructor(scope: aws_core.App, id: string) {
    let stage = "prod";

    switch (process.env.NODE_ENV) {
      case "production":
        stage = "prod";
        break;

      case "staging":
        if (!process.env.PR_NUM)
          throw new Error("Running in staging environment but no PR number specified. Stop.");
        stage = `staging-${process.env.PR_NUM}`;
        break;

      case "development":
        throw new Error("Cannot deploy stack in development environment. Stop.");

      default:
        throw new Error("Invalid environment specified. Stop.");
    }

    super(scope, id, {
      env: {
        region: "us-east-1",
      },
      terminationProtection: /*stage === "prod"*/ false,
    });

    this.stage = stage;

    if (isCdk()) {
      this.synth();
    }
  }

  synth() {
    if (!process.env.CERTIFICATE_ARN) throw new Error("Certificate ARN not provided. Stop.");
    if (!process.env.DATABASE_URL) throw new Error("Database URL not provided. Stop.");
    if (!process.env.HOSTED_ZONE_ID) throw new Error("Hosted Zone ID not provided. Stop.");

    const certificateArn = process.env.CERTIFICATE_ARN;
    const hostedZoneId = process.env.HOSTED_ZONE_ID ?? "hi";
    const recordName = `${this.stage === "prod" ? "" : `${this.stage}-`}docs.api-next`;
    const zoneName = "peterportal.org";

    const workspaceRoot = getWorkspaceRoot(process.cwd());

    this.staticSite = new StaticSite(this, "Docs", {
      assets: path.join(workspaceRoot, "apps", "docs", "build"),
      constructs: {
        bucketProps() {
          return {
            bucketName: `${recordName}.${zoneName}`,
            removalPolicy: aws_core.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
          };
        },
        distributionProps(scope) {
          return {
            certificate: aws_certificatemanager.Certificate.fromCertificateArn(
              scope,
              "peterportal-cert",
              certificateArn
            ),
            defaultRootObject: "index.html",
            domainNames: [`${recordName}.${zoneName}`],
            defaultBehavior: {
              origin: new aws_cloudfront_origins.S3Origin(scope.bucket, {
                originAccessIdentity: scope.originAccessIdentity,
              }),
              allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
              viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
              {
                httpStatus: 403,
                responseHttpStatus: 200,
                responsePagePath: "/index.html",
              },
            ],
          };
        },
      },
    });

    this.cloudFrontTarget = new aws_route53_targets.CloudFrontTarget(this.staticSite.distribution);

    this.zone = aws_route53.HostedZone.fromHostedZoneAttributes(this, "peterportal-hosted-zone", {
      zoneName,
      hostedZoneId,
    });

    this.aRecord = new aws_route53.ARecord(
      this,
      `peterportal-api-next-docs-a-record-${this.stage}`,
      {
        zone: this.zone,
        recordName,
        target: aws_route53.RecordTarget.fromAlias(this.cloudFrontTarget),
      }
    );
  }
}

export default function main() {
  const app = new aws_core.App();

  const myStack = new ApiStack(app, "TestingPpaReleaseCandidateStack");

  const stack = new DocsStack(app, "GitHubStuff");

  new GitHub(stack, "GitHub", {
    outputs: {
      apiUrl: {
        value: myStack.api.api.urlForPath() ?? "no api url",
      },
      docsUrl: {
        value: stack.aRecord.domainName ?? "no docs url",
      },
    },
    callbacks: {
      async onPostDeploy(outputs) {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput("GITHUB_TOKEN");
        const PR_NUM = github.context.payload.pull_request?.number;

        if (!PR_NUM) {
          throw new Error("❌ Error: Pull request number not detected.");
        }

        const octokit = github.getOctokit(GITHUB_TOKEN);

        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;
        const ref = github.context.ref;

        const apiDeployment = await octokit.rest.repos.createDeployment({
          owner,
          repo,
          ref,
          required_contexts: [],
          environment: "staging - api",
        });

        const docsDeployment = await octokit.rest.repos.createDeployment({
          owner,
          repo,
          ref,
          required_contexts: [],
          environment: "staging - docs",
        });

        if (apiDeployment.status !== 201 || docsDeployment.status !== 201) {
          throw new Error("❌ Creating deployments failed!");
        }

        const apiDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
          repo,
          owner,
          deployment_id: apiDeployment.data.id,
          state: "success",
          description: "Deployment succeeded",
          environment_url: outputs.apiUrl,
          auto_inactive: false,
        });

        const docsDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
          repo,
          owner,
          deployment_id: docsDeployment.data.id,
          state: "success",
          description: "Deployment succeeded",
          environment_url: `https://${outputs.docsUrl}`,
          auto_inactive: false,
        });

        consola.info("ℹ️ API deployment status: ", apiDeploymentStatus.data);
        consola.info("ℹ️ Docs deployment status: ", docsDeploymentStatus.data);

        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: PR_NUM,
          body: `\
🚀 Staging instances deployed!

API - ${apiDeploymentStatus.data.environment_url}

Docs - ${docsDeploymentStatus.data.environment_url}
`,
        });
      },
    },
  });

  return app;
}

main();
