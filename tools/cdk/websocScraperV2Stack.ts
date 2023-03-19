import type { StackProps } from "aws-cdk-lib";
import { RemovalPolicy, Size, Stack } from "aws-cdk-lib";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { InstanceType, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  AsgCapacityProvider,
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  EcsOptimizedImage,
  LinuxParameters,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
} from "aws-cdk-lib/custom-resources";
import type { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class WebsocScraperV2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    if (process.env.NODE_ENV !== "production")
      throw new Error("Cannot deploy this stack outside of production. Stop.");
    if (!process.env.DATABASE_URL_SCRAPER)
      throw new Error("Scraper database URL not provided. Stop.");
    super(scope, id, props);
    const vpc = new Vpc(this, `${id}-vpc`);
    const cluster = new Cluster(this, `${id}-cluster`, { vpc });
    const asg = new AutoScalingGroup(this, `${id}-asg`, {
      instanceType: new InstanceType("t3a.micro"),
      machineImage: EcsOptimizedImage.amazonLinux2(),
      minCapacity: 1,
      maxCapacity: 1,
      vpc,
    });
    // https://github.com/aws/aws-cdk/issues/18179#issuecomment-1150981559
    const asgForceDelete = new AwsCustomResource(this, "asg-force-delete", {
      installLatestAwsSdk: false,
      onDelete: {
        service: "AutoScaling",
        action: "deleteAutoScalingGroup",
        parameters: {
          AutoScalingGroupName: asg.autoScalingGroupName,
          ForceDelete: true,
        },
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    asgForceDelete.node.addDependency(asg);
    /*
     * This allocates a 2 GiB swap file on each EC2 instance
     * and enables it for use. Consider removing this in the future
     * if it becomes unnecessary, e.g. if we get more RAM per instance.
     */
    asg.userData.addCommands(
      "dd if=/dev/zero of=/swap bs=1M count=2048",
      "chmod 0600 /swap",
      "mkswap /swap",
      "swapon /swap",
      'echo "/swap none swap defaults 0 0" >>/etc/fstab'
    );
    cluster.addAsgCapacityProvider(
      new AsgCapacityProvider(this, `${id}-asg-capacity-provider`, {
        autoScalingGroup: asg,
      })
    );
    const linuxParameters = new LinuxParameters(this, `${id}-linux-params`, {
      maxSwap: Size.mebibytes(1536),
      swappiness: 90,
    });
    linuxParameters.addTmpfs({ containerPath: "/tmp", size: 128 });
    const taskDefinition = new Ec2TaskDefinition(this, `${id}-taskdef`);
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
      memoryReservationMiB: 768,
      linuxParameters,
      logging: LogDriver.awsLogs({
        logGroup: new LogGroup(this, `${id}-log-group`, {
          logGroupName: `/aws/ecs/cluster/${id}`,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        streamPrefix: "/aws/ecs/container",
      }),
    });
    new Ec2Service(this, `${id}-service`, { cluster, taskDefinition });
  }
}
