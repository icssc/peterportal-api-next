import { Stack, StackProps } from "aws-cdk-lib";
import {
  AmazonLinuxCpuType,
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  Instance,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class WebsocScraperV2Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const vpc = new Vpc(this, `${id}-vpc`);
    const securityGroup = new SecurityGroup(this, `${id}-sg`, { vpc });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    const instance = new Instance(this, `${id}-instance`, {
      instanceType: new InstanceType("t4g.micro"),
      machineImage: new AmazonLinuxImage({
        cpuType: AmazonLinuxCpuType.ARM_64,
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });
    const dist = new Asset(this, `${id}-dist`, {
      path: join(
        dirname(fileURLToPath(import.meta.url)),
        `../websoc-scraper-v2/dist/websoc-scraper-v2.tar.gz`
      ),
    });
    const setup = new Asset(this, `${id}-setup`, {
      path: join(dirname(fileURLToPath(import.meta.url)), `setup.sh`),
    });
    setup.grantRead(instance.role);
    instance.userData.addExecuteFileCommand({
      filePath: instance.userData.addS3DownloadCommand({
        bucket: setup.bucket,
        bucketKey: setup.s3ObjectKey,
      }),
      arguments: instance.userData.addS3DownloadCommand({
        bucket: dist.bucket,
        bucketKey: dist.s3ObjectKey,
      }),
    });
  }
}
