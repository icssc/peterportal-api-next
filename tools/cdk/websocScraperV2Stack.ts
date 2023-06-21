import { dirname, join } from "path";
import { fileURLToPath } from "url";

import type { StackProps } from "aws-cdk-lib";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";

export class WebsocScraperV2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    if (process.env.NODE_ENV !== "production")
      throw new Error("Cannot deploy this stack outside of production. Stop.");
    if (!process.env.DATABASE_URL_SCRAPER)
      throw new Error("Scraper database URL not provided. Stop.");
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
    const cluster = new Cluster(this, `${id}-cluster`, { vpc });
    const taskDefinition = new FargateTaskDefinition(this, `${id}-taskdef`, {
      cpu: 256,
      memoryLimitMiB: 2048,
    });
    taskDefinition.addContainer(`${id}-container`, {
      containerName: `${id}-container`,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL_SCRAPER,
        NODE_ENV: "production",
        NODE_OPTIONS: "--max-old-space-size=2048",
        TZ: "America/Los_Angeles",
      },
      image: ContainerImage.fromAsset(
        join(dirname(fileURLToPath(import.meta.url)), "../websoc-scraper-v2/")
      ),
      logging: LogDriver.awsLogs({
        logGroup: new LogGroup(this, `${id}-log-group`, {
          logGroupName: `/aws/ecs/cluster/${id}`,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        streamPrefix: "/aws/ecs/container",
      }),
    });
    new FargateService(this, `${id}-service`, {
      assignPublicIp: true,
      cluster,
      taskDefinition,
    });
  }
}
