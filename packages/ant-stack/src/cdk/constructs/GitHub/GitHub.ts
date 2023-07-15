import fs from "node:fs";

import { App, Stack, CfnOutput, CfnOutputProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { createTemporaryFile } from "packages/ant-stack/src/utils/files.js";

import { synthesizeConfig } from "../../../config.js";
import { MaybePromise } from "../../../utils/maybe-promise.js";

export type GitHubCallbacks<T> = {
  onPreDeploy: (outputs: T) => MaybePromise<unknown>;

  onPostDeploy: (outputs: T) => MaybePromise<unknown>;

  onPreDestroy: (outputs: T) => MaybePromise<unknown>;

  onPostDestroy: (outputs: T) => MaybePromise<unknown>;
};

export interface GitHubConfig<T> {
  outputsFile?: string;
  outputs: T;
  callbacks: GitHubCallbacks<T>;
}

type Outputs = Record<PropertyKey, CfnOutputProps>;

type JsonFrom<T> = {
  [K in keyof T]: string;
};

/**
 * Construct for configuring GitHub Actions CI/CD.
 */
export class GitHub<T extends Outputs = Outputs> extends Construct {
  public static readonly type = "GitHub" as const;

  public readonly type = GitHub.type;

  public static isGitHub(x: unknown): x is GitHub {
    return Construct.isConstruct(x) && "type" in x && x["type"] === GitHub.type;
  }

  public readonly outputsFile: string;

  public readonly stackName: string;

  public readonly outputs: Record<PropertyKey, CfnOutput>;

  constructor(scope: Construct, id: string, readonly config: GitHubConfig<T>) {
    super(scope, id);

    this.outputsFile = config.outputsFile ?? createTemporaryFile("outputs", ".json");

    this.stackName = Stack.of(this).stackName;

    this.outputs = Object.entries(config.outputs).reduce((outputs, [key, value]) => {
      outputs[key] = new CfnOutput(this, key, value);
      return outputs;
    }, {} as Record<PropertyKey, CfnOutput>);
  }

  public parseOutputs(): JsonFrom<T> {
    try {
      const fileContents = fs.readFileSync(this.outputsFile, "utf-8");
      return JSON.parse(fileContents);
    } catch {
      console.log(`Failed to parse outputs file at ${this.outputsFile}.`);
      return {} as JsonFrom<T>;
    }
  }
}

/**
 * Get a GitHub construct defined in the root config.
 */
export async function getGitHub(initializedApp?: App): Promise<GitHub> {
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
