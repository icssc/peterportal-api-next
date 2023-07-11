import { spawn } from "node:child_process";
import path from "node:path";

import core from "@actions/core";
import github from "@actions/github";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete,
  waitUntilStackUpdateComplete,
  StackStatus,
} from "@aws-sdk/client-cloudformation";
import type { WaiterResult, WaiterConfiguration } from "@aws-sdk/util-waiter";
import consola from "consola";

import { getClosestProjectDirectory } from "../../utils/directories.js";

const projectDirectory = getClosestProjectDirectory(__dirname);

const appEntry = path.join(projectDirectory, "src", "cdk", "index.ts");

const app = `tsx ${appEntry}`;

const cdkCommand = ["cdk", "deploy", "--app", app, "*", "--require-approval", "never"];

/**
 * Wait for existing CloudFormation stack to be in an idle state.
 */
async function waitForStackIdle(
  cloudFormationClient: CloudFormationClient,
  stackName: string
): Promise<WaiterResult | void> {
  const stackCommand = new DescribeStacksCommand({ StackName: stackName });

  try {
    const stackInfo = await cloudFormationClient.send(stackCommand);

    const stackStatus = stackInfo.Stacks?.[0]?.StackStatus;

    if (!stackStatus) {
      return;
    }

    const params: WaiterConfiguration<CloudFormationClient> = {
      client: cloudFormationClient,
      maxWaitTime: 1800,
    };

    switch (stackStatus) {
      case StackStatus.CREATE_IN_PROGRESS:
        return await waitUntilStackCreateComplete(params, { StackName: stackName });

      case StackStatus.UPDATE_IN_PROGRESS:
        return await waitUntilStackUpdateComplete(params, { StackName: stackName });

      case StackStatus.DELETE_IN_PROGRESS:
        return await waitUntilStackDeleteComplete(params, { StackName: stackName });

      default:
        return;
    }
  } catch {
    return;
  }
}

export async function deploy() {
  const cfnClient = new CloudFormationClient({});

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput("GITHUB_TOKEN");
  const PR_NUM = github.context.payload.pull_request?.number;

  const octokit = github.getOctokit(GITHUB_TOKEN);

  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const ref = github.context.ref;

  if (!PR_NUM) {
    throw new Error("❌ Error: Pull request number not detected.");
  }

  consola.info("⏳ Waiting until all CloudFormation updates are complete");

  await Promise.all([
    waitForStackIdle(cfnClient, `peterportal-api-next-staging-${PR_NUM}`),
    waitForStackIdle(cfnClient, `peterportal-api-next-docs-staging-${PR_NUM}`),
  ]);

  consola.info("🚀 Deploying CDK stacks");

  const cdkChild = spawn("npx", cdkCommand);

  cdkChild.stdout.on("data", (data: Buffer) => consola.info(data.toString()));

  cdkChild.stderr.on("data", (data: Buffer) => consola.error(data.toString()));

  cdkChild.on("close", async () => {
    consola.info("ℹ️ Creating API and Docs deployment statuses");

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
      throw new Error("❌ Deployment failed!");
    }

    const apiDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
      repo,
      owner,
      deployment_id: apiDeployment.data.id,
      state: "success",
      description: "Deployment succeeded",
      environment_url: `https://staging-${PR_NUM}.api-next.peterportal.org`,
      auto_inactive: false,
    });

    const docsDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
      repo,
      owner,
      deployment_id: docsDeployment.data.id,
      state: "success",
      description: "Deployment succeeded",
      environment_url: `https://staging-${PR_NUM}-docs.api-next.peterportal.org`,
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
  });
}
