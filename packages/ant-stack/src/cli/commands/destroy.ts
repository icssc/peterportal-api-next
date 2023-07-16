import { spawn } from "node:child_process";
import path from "node:path";

import core from "@actions/core";
import github from "@actions/github";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { App } from "aws-cdk-lib/core";
import consola from "consola";

import { getClosestProjectDirectory, waitForStackIdle } from "../../utils";

const projectDirectory = getClosestProjectDirectory(__dirname);

const appEntry = path.join(projectDirectory, "src", "cdk", "index.ts");

const app = `tsx ${appEntry}`;

const cdkCommand = ["cdk", "destroy", "--app", app, "*", "--require-approval", "never"];

export async function destroy(app?: App) {
  const cfnClient = new CloudFormationClient({});

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput("GITHUB_TOKEN");
  const PR_NUM = github.context.payload.pull_request?.number;

  if (!PR_NUM) {
    throw new Error("❌ Error: Pull request number not detected.");
  }

  consola.info("⏳ Waiting until all CloudFormation updates are complete");

  await Promise.all([
    waitForStackIdle(cfnClient, `peterportal-api-next-staging-${PR_NUM}`),
    waitForStackIdle(cfnClient, `peterportal-api-next-docs-staging-${PR_NUM}`),
  ]);

  consola.info("🗑️ Destroying CDK stacks");

  const cdkChild = spawn("npx", cdkCommand);

  cdkChild.stdout.on("data", (data: Buffer) => consola.info(data.toString()));

  cdkChild.stderr.on("data", (data: Buffer) => consola.error(data.toString()));

  cdkChild.on("close", async () => {
    consola.info("ℹ️ Creating API and Docs deployment statuses");
    const octokit = github.getOctokit(GITHUB_TOKEN);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const ref = github.context.ref;

    const apiDeployments = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      ref,
      required_contexts: [],
      environment: "staging - api",
    });

    const docsDeployments = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      ref,
      required_contexts: [],
      environment: "staging - docs",
    });

    if (apiDeployments.status !== 200 || docsDeployments.status !== 200) {
      throw new Error("Unable to retrieve deployments");
    }

    /**
     * Deactivate all previous API staging deployments.
     */
    await Promise.all(
      apiDeployments.data.map((deployment) =>
        octokit.rest.repos.createDeploymentStatus({
          repo: github.context.repo.repo,
          owner: github.context.repo.owner,
          deployment_id: deployment.id,
          state: "inactive",
        })
      )
    );

    /**
     * Deactivate all previous docs staging deployments.
     */
    await Promise.all(
      docsDeployments.data.map((deployment) =>
        octokit.rest.repos.createDeploymentStatus({
          repo: github.context.repo.repo,
          owner: github.context.repo.owner,
          deployment_id: deployment.id,
          state: "inactive",
        })
      )
    );

    consola.info("✅ Deactivated all previous deployments");
  });
}
