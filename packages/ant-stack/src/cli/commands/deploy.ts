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
} from "@aws-sdk/client-cloudformation";
import { WaiterResult } from "@aws-sdk/util-waiter";
import consola from "consola";

import { getClosestProjectDirectory } from "../../utils";

const projectDirectory = getClosestProjectDirectory(__dirname);

const appEntry = path.join(projectDirectory, "src", "cdk", "index.ts");

const app = `tsx ${appEntry}`;

const cdkCommand = ["cdk", "deploy", "--app", app, "*", "--require-approval", "never"];

async function stabilizeStack(
  cfnClient: CloudFormationClient,
  stackName: string
): Promise<WaiterResult | void> {
  try {
    const stackStatus = ((await cfnClient.send(new DescribeStacksCommand({ StackName: stackName })))
      ?.Stacks ?? [])[0]?.StackStatus;
    if (!stackStatus) return;
    switch (stackStatus) {
      case "CREATE_IN_PROGRESS":
        return await waitUntilStackCreateComplete(
          { client: cfnClient, maxWaitTime: 1800 },
          { StackName: stackName }
        );
      case "UPDATE_IN_PROGRESS":
        return await waitUntilStackUpdateComplete(
          { client: cfnClient, maxWaitTime: 1800 },
          { StackName: stackName }
        );
      case "DELETE_IN_PROGRESS":
        return await waitUntilStackDeleteComplete(
          { client: cfnClient, maxWaitTime: 1800 },
          { StackName: stackName }
        );
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

  if (!PR_NUM) {
    throw new Error("❌ Error: Pull request number not detected.");
  }

  consola.info("⏳ Waiting until all CloudFormation updates are complete");

  await stabilizeStack(cfnClient, `peterportal-api-next-staging-${PR_NUM}`);

  await stabilizeStack(cfnClient, `peterportal-api-next-docs-staging-${PR_NUM}`);

  consola.info("🚀 Deploying CDK stacks");

  const cdkChild = spawn("npx", cdkCommand);

  cdkChild.stdout.on("data", (data) => consola.info(data));
  cdkChild.stderr.on("data", (data) => consola.info(data));
  cdkChild.on("close", async () => {
    consola.info("ℹ️ Creating API and Docs deployment statuses");

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
      throw new Error("❌ Deployment failed!");
    }

    const apiDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
      repo: github.context.repo.repo,
      owner: github.context.repo.owner,
      deployment_id: apiDeployment.data.id,
      state: "success",
      description: "Deployment succeeded",
      environment_url: `https://staging-${PR_NUM}.api-next.peterportal.org`,
      auto_inactive: false,
    });

    const docsDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
      repo: github.context.repo.repo,
      owner: github.context.repo.owner,
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
