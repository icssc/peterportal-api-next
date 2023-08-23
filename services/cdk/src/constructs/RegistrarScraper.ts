import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RemovalPolicy } from "aws-cdk-lib";
import { IVpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage, LogDriver } from "aws-cdk-lib/aws-ecs";
import { ScheduledFargateTask } from "aws-cdk-lib/aws-ecs-patterns";
import { Schedule } from "aws-cdk-lib/aws-events";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class RegistrarScraper extends Construct {
  constructor(scope: Construct, id: string, vpc: IVpc) {
    if (!process.env.DATABASE_URL_REGISTRAR_SCRAPER)
      throw new Error("Scraper database URL not provided. Stop.");
    super(scope, id);
    const cluster = new Cluster(this, `${id}-cluster`, { vpc });
    new ScheduledFargateTask(this, `${id}-taskdef`, {
      cluster,
      schedule: Schedule.cron({
        minute: "0",
        hour: "12",
        day: "1",
        month: "*",
      }),
      scheduledFargateTaskImageOptions: {
        cpu: 256,
        memoryLimitMiB: 2048,
        environment: {
          DATABASE_URL: process.env.DATABASE_URL_REGISTRAR_SCRAPER,
          NODE_ENV: "production",
          NODE_OPTIONS: "--max-old-space-size=2048",
          TZ: "America/Los_Angeles",
        },
        image: ContainerImage.fromAsset(
          join(dirname(fileURLToPath(import.meta.url)), "../../../registrar-scraper/"),
        ),
        logDriver: LogDriver.awsLogs({
          logGroup: new LogGroup(this, `${id}-log-group`, {
            logGroupName: `/aws/ecs/cluster/${id}`,
            removalPolicy: RemovalPolicy.DESTROY,
          }),
          streamPrefix: "/aws/ecs/container",
        }),
      },
      subnetSelection: { subnetType: SubnetType.PUBLIC },
    });
  }
}
