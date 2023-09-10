import path from "node:path";
import { fileURLToPath } from "node:url";

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

export interface DocsStackProps extends StackProps {
  stage?: string;
}

export class DocsStack extends Stack {
  constructor(scope: Construct, id: string, props: DocsStackProps = {}) {
    if (!process.env.CERTIFICATE_ARN) {
      throw new Error("Certificate ARN not provided. Stop.");
    }

    if (!process.env.HOSTED_ZONE_ID) {
      throw new Error("Hosted Zone ID not provided. Stop.");
    }

    super(scope, id, props);

    const certificateArn = process.env.CERTIFICATE_ARN;
    const hostedZoneId = process.env.HOSTED_ZONE_ID;
    const recordName = `${props.stage === "prod" ? "" : `${props.stage}-`}docs.api-next`;
    const zoneName = "peterportal.org";

    const destinationBucket = new Bucket(this, `peterportal-api-next-docs-bucket-${props.stage}`, {
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
      }),
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

    new ARecord(this, `peterportal-api-next-docs-a-record-${props.stage}`, {
      zone: HostedZone.fromHostedZoneAttributes(this, "peterportal-hosted-zone", {
        zoneName,
        hostedZoneId,
      }),
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new BucketDeployment(this, "bucket-deployment", {
      sources: [
        Source.asset(
          path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../apps/docs/build"),
        ),
      ],
      destinationBucket,
      distribution,
      distributionPaths: ["/*"],
    });
  }
}
