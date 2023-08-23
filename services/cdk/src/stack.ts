import { Stack } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import { WebsocProxyService } from "./constructs/WebsocProxyService";

export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    if (process.env.NODE_ENV !== "production")
      throw new Error("Cannot deploy this stack outside of production. Stop.");
    super(scope, id, props);
    new WebsocProxyService(scope, `${id}-websoc-proxy-service`, props);
  }
}
