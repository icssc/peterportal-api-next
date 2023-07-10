import core from "@actions/core";
import github from "@actions/github";

/**
 * Creates a GitHub deployment environment.
 *
 * TODO: not sure where to put this at the moment.
 * This should be invoked by `ant-stack deploy`, but theoretically is a standalone module.
 *
 * Will leave this here as reference until further decisions are made :^)
 */
async function main() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput("GITHUB_TOKEN");
  const PR_NUM = process.env.PR_NUM ?? core.getInput("PR_NUM");
  const octokit = github.getOctokit(GITHUB_TOKEN);

  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const ref = github.context.ref;

  const apiDeployment = await octokit.rest.repos.createDeployment({
    owner,
    repo,
    ref,
    required_contexts: [],
  });

  const docsDeployment = await octokit.rest.repos.createDeployment({
    owner,
    repo,
    ref,
    required_contexts: [],
  });

  if (apiDeployment.status !== 201 || docsDeployment.status !== 201) {
    throw new Error("Deployment failed");
  }

  await octokit.rest.repos.createDeploymentStatus({
    repo: github.context.repo.repo,
    owner: github.context.repo.owner,
    deployment_id: apiDeployment.data.id,
    state: "success",
    description: "Deployment succeeded",
    environment_url: `https://staging-${{ PR_NUM }}.api-next.peterportal.org`,
    auto_inactive: false,
    environment: "staging",
  });

  await octokit.rest.repos.createDeploymentStatus({
    repo: github.context.repo.repo,
    owner: github.context.repo.owner,
    deployment_id: docsDeployment.data.id,
    state: "success",
    description: "Deployment succeeded",
    environment_url: `https://staging-${{ PR_NUM }}-docs.api-next.peterportal.org`,
    auto_inactive: false,
    environment: "staging",
  });
}

main();
