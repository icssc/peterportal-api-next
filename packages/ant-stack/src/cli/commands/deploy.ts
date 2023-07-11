import { spawnSync } from "node:child_process";
import path from "node:path";

import core from "@actions/core";
import github from "@actions/github";
import consola from "consola";

import { getClosestProjectDirectory } from "../../utils/directories.js";

const projectDirectory = getClosestProjectDirectory(__dirname);

const appEntry = path.join(projectDirectory, "src", "cdk", "index.ts");

const app = `tsx ${appEntry}`;

const cdkCommand = ["cdk", "deploy", "--app", app, "*", "--require-approval", "never"];

export async function deploy() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput("GITHUB_TOKEN");
  const PR_NUM = github.context.payload.pull_request?.number;
  const STACK_NAME = `peterportal-api-next-staging-${PR_NUM}`;

  consola.info(
    "Checking if CloudFormation stack exists and waiting until all CloudFormation updates are complete"
  );

  spawnSync(`aws cloudformation wait stack-update-complete --stack-name ${STACK_NAME}`);

  consola.info("Deploying CDK stack");

  spawnSync("npx", cdkCommand);

  consola.info("Creating API and Docs deployment statuses");

  if (!PR_NUM) {
    throw new Error("Stop, this is not a pull request!");
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
    throw new Error("Deployment failed");
  }

  const apiDeploymentStatus = await octokit.rest.repos.createDeploymentStatus({
    repo: github.context.repo.repo,
    owner: github.context.repo.owner,
    deployment_id: apiDeployment.data.id,
    state: "success",
    description: "Deployment succeeded",
    environment_url: `https://staging-${github.context.payload.pull_request?.number}.api-next.peterportal.org`,
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

  consola.info("API deployment status: ", apiDeploymentStatus.data);
  consola.info("Docs deployment status: ", docsDeploymentStatus.data);

  apiDeploymentStatus.data.environment_url;

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
}
