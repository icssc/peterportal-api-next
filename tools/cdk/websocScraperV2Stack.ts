import { Stack, StackProps } from "aws-cdk-lib";
import {
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  AmiHardwareType,
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  EcsOptimizedImage,
  NetworkMode,
} from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const cwd = dirname(fileURLToPath(import.meta.url));

export class WebsocScraperV2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const vpc = new Vpc(this, `${id}-vpc`);
    const securityGroups = [new SecurityGroup(this, `${id}-sg`, { vpc })];
    securityGroups[0].addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    const cluster = new Cluster(this, `${id}-cluster`, { vpc });
    cluster.addCapacity(`${id}-capacity`, {
      instanceType: new InstanceType("t3a.micro"),
      machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD),
      minCapacity: 1,
      maxCapacity: 1,
      vpcSubnets: vpc,
    });
    const taskDefinition = new Ec2TaskDefinition(this, `${id}-taskdef`, {
      networkMode: NetworkMode.AWS_VPC,
    });
    taskDefinition.addContainer(`${id}-container`, {
      image: ContainerImage.fromAsset(join(cwd, "../websoc-scraper-v2/")),
      memoryLimitMiB: 768,
    });
    new Ec2Service(this, `${id}-service`, {
      cluster,
      taskDefinition,
      securityGroups,
      vpcSubnets: vpc,
    });
  }
}
