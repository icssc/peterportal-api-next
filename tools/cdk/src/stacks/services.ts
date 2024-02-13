import { Stack } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";

import { WebsocProxy } from "../constructs/WebsocProxy";
import { WebsocScraperV2 } from "../constructs/WebsocScraperV2";

export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("Cannot deploy this stack outside of production. Stop.");
    }

    super(scope, id, props);

    const vpc = new Vpc(this, `${id}-vpc`, {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: `${id}-subnet-configuration`,
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    new WebsocProxy(this, `${id}-websoc-proxy`);

    new WebsocScraperV2(this, `${id}-websoc-scraper-v2`, vpc);
  }
}
