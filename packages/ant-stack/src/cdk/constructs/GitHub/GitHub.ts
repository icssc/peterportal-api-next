import fs from "node:fs";

import { App, Stack, CfnOutput, CfnOutputProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { synthesizeConfig } from "../../../config.js";
import { MaybePromise, createTemporaryFile } from "../../../utils";

type Outputs = Record<PropertyKey, CfnOutputProps>;

type JsonFrom<T> = {
  [K in keyof T]: string;
};

export type GitHubCallbacks<T> = {
  onPreDeploy: (outputs: JsonFrom<T>) => MaybePromise<unknown>;

  onPostDeploy: (outputs: JsonFrom<T>) => MaybePromise<unknown>;

  onPreDestroy: (outputs: JsonFrom<T>) => MaybePromise<unknown>;

  onPostDestroy: (outputs: JsonFrom<T>) => MaybePromise<unknown>;
};

export interface GitHubConfig<T> {
  outputsFile?: string;
  outputs?: T;
  callbacks?: Partial<GitHubCallbacks<T>>;
}

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

  /**
   * The stack that this construct is defined in.
   */
  public readonly stack: Stack;

  public readonly outputs: Record<PropertyKey, CfnOutput>;

  constructor(scope: Construct, id: string, readonly config: GitHubConfig<T>) {
    super(scope, id);

    this.outputsFile = config.outputsFile ?? createTemporaryFile("outputs.json");

    this.stack = Stack.of(this);

    /**
     * CfnOutputs should be scoped directly under the stack so the keys don't get polluted.
     * Strings representing nested constructs will be appended to the key otherwise.
     */
    this.outputs = Object.entries(config.outputs ?? {}).reduce((outputs, [key, value]) => {
      outputs[key] = new CfnOutput(this.stack, key, value);
      return outputs;
    }, {} as Record<PropertyKey, CfnOutput>);
  }

  public parseOutputs(): JsonFrom<T> {
    try {
      const fileContents = fs.readFileSync(this.outputsFile, "utf-8");
      const json = JSON.parse(fileContents);

      if (json[this.stack.stackName] == null) {
        throw new Error();
      }

      return json[this.stack.stackName];
    } catch (e) {
      console.log(
        `Error: ${e}. Failed to parse outputs file at ${this.outputsFile} for the stack: ${this.stack.stackName}`
      );
      return {} as JsonFrom<T>;
    }
  }

  public onPreDeploy() {
    return this.config.callbacks?.onPreDeploy?.(this.parseOutputs());
  }

  public onPostDeploy() {
    return this.config.callbacks?.onPostDeploy?.(this.parseOutputs());
  }

  public onPreDestroy() {
    return this.config.callbacks?.onPreDestroy?.(this.parseOutputs());
  }

  public onPostDestroy() {
    return this.config.callbacks?.onPostDestroy?.(this.parseOutputs());
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
