/**
 * IMPORTANT: we can't import the entirety of aws-cdk-lib because it will nuke our memory when we JIT execute!
 *
 * NOO! 🤬
 * ```ts
 * import * as cdk from 'aws-cdk-lib'
 * ```
 */
import { consola } from "consola";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { App, Stack } from "aws-cdk-lib/core";
import { Api } from "ant-stack/constructs/api";
import { GitHub } from "ant-stack/constructs/github";

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

export class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    const api = new Api(this, "Api", {
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

    new GitHub(this, "GitHub", {
      outputs: {
        invokeUrl: {
          value: api.api.urlForPath(),
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

          if (apiDeployment.status !== 201) {
            throw new Error("❌ Deployment failed!");
          }

          const apiDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
            repo,
            owner,
            deployment_id: apiDeployment.data.id,
            state: "success",
            description: "Deployment succeeded",
            environment_url: outputs.invokeUrl,
            auto_inactive: false,
          });

          consola.info("ℹ️ API deployment status: ", apiDeploymentStatus.data);

          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: PR_NUM,
            body: `\
🚀 Staging instances deployed!

API - ${apiDeploymentStatus.data.environment_url}
`,
          });
        },
      },
    });
  }
}

export default function main() {
  const app = new App();

  new MyStack(app, "TestingPpaReleaseCandidateStack");

  return app;
}

main();
