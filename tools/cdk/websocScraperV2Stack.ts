import { type StackProps, Stack } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import type { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class WebsocScraperV2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const cluster = new Cluster(this, `${id}-cluster`, {
      capacity: {
        instanceType: new InstanceType("t3a.micro"),
        minCapacity: 1,
        maxCapacity: 1,
      },
    });
    const taskDefinition = new Ec2TaskDefinition(this, `${id}-taskdef`);
    taskDefinition.addContainer(`${id}-container`, {
      containerName: `${id}-container`,
      image: ContainerImage.fromAsset(
        join(dirname(fileURLToPath(import.meta.url)), "../websoc-scraper-v2/")
      ),
      memoryReservationMiB: 768,
      logging: LogDriver.awsLogs({ streamPrefix: "aws/ecs/task/" }),
    });
    new Ec2Service(this, `${id}-service`, { cluster, taskDefinition });
  }
}
