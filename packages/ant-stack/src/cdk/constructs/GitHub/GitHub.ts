import { App, Stack } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { synthesizeConfig } from "../../../config.js";
import { MaybePromise } from "../../../utils/maybe-promise.js";

export interface GitHubConfig {
  onDeploy: () => MaybePromise<void>;
  onDestroy: () => MaybePromise<void>;
}

/**
 * Construct for configuring GitHub Actions CI/CD.
 */
export class GitHub extends Construct {
  public static readonly type = "GitHub" as const;

  public readonly type = GitHub.type;

  public static isGitHub(x: unknown): x is GitHub {
    return Construct.isConstruct(x) && "type" in x && x["type"] === GitHub.type;
  }

  constructor(scope: Construct, id: string, readonly config: GitHubConfig) {
    super(scope, id);
  }
}

/**
 * Get a GitHub construct defined in the root config.
 */
export async function getApi(initializedApp?: App): Promise<GitHub> {
  const app = initializedApp ?? (await synthesizeConfig());

  const stacks = app.node.children.find(Stack.isStack);

  if (!stacks) {
    throw new Error(`No stacks found.`);
  }

  const gitHub = stacks?.node.children.find(GitHub.isGitHub);

  if (!gitHub) {
    throw new Error(`No ${GitHub.type} construct found.`);
  }

  return gitHub;
}
