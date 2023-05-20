import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CanonicalUserPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import path from "path";
import { fileURLToPath } from "url";

export class DocsStack extends Stack {
  constructor(scope: Construct, id: string) {
    if (!process.env.CERTIFICATE_ARN) throw new Error("Certificate ARN not provided. Stop.");
    if (!process.env.DATABASE_URL) throw new Error("Database URL not provided. Stop.");
    if (!process.env.HOSTED_ZONE_ID) throw new Error("Hosted Zone ID not provided. Stop.");

    let stage: string;
    switch (process.env.NODE_ENV) {
      case "production":
        stage = "prod";
        break;
      case "staging":
        if (!process.env.PR_NUM)
          throw new Error("Running in staging environment but no PR number specified. Stop.");
        stage = `staging-${process.env.PR_NUM}`;
        break;
      case "development":
        throw new Error("Cannot deploy stack in development environment. Stop.");
      default:
        throw new Error("Invalid environment specified. Stop.");
    }

    const props: StackProps = {
      env: { region: "us-east-1" },
      terminationProtection: /*stage === "prod"*/ false,
    };

    super(scope, `${id}-${stage}`, props);

    const certificateArn = process.env.CERTIFICATE_ARN;
    const hostedZoneId = process.env.HOSTED_ZONE_ID;
    const recordName = `${stage === "prod" ? "" : `${stage}-`}docs.api-next`;
    const zoneName = "peterportal.org";

    const destinationBucket = new Bucket(this, `peterportal-api-next-docs-bucket-${stage}`, {
      bucketName: `${recordName}.${zoneName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const cloudfrontOAI = new OriginAccessIdentity(this, "OAI");

    destinationBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [destinationBucket.arnForObjects("*")],
        principals: [
          new CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId),
        ],
      })
    );

    const distribution = new Distribution(this, "distribution", {
      certificate: Certificate.fromCertificateArn(this, "peterportal-cert", certificateArn),
      defaultRootObject: "index.html",
      domainNames: [`${recordName}.${zoneName}`],
      defaultBehavior: {
        origin: new S3Origin(destinationBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new ARecord(this, `peterportal-api-next-docs-a-record-${stage}`, {
      zone: HostedZone.fromHostedZoneAttributes(this, "peterportal-hosted-zone", {
        zoneName,
        hostedZoneId,
      }),
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new BucketDeployment(this, "bucket-deployment", {
      sources: [Source.asset(path.join(path.dirname(fileURLToPath(import.meta.url)), `../build`))],
      destinationBucket,
      distribution,
      distributionPaths: ["/*"],
    });
  }
}
