import { RemovalPolicy } from "aws-cdk-lib";
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

export interface StaticSiteProps {
  /**
   * Full path to the directory containing the static site assets.
   */
  assets: string;
}

export class StaticSite extends Construct {
  bucket: Bucket;

  distribution: Distribution;

  bucketDeployment: BucketDeployment;

  originAccessIdentity: OriginAccessIdentity;

  aRecord: ARecord;

  constructor(scope: Construct, id: string, readonly props: StaticSiteProps) {
    super(scope, id);

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

    const certificateArn = process.env.CERTIFICATE_ARN;

    const hostedZoneId = process.env.HOSTED_ZONE_ID;

    const recordName = `${stage === "prod" ? "" : `${stage}-`}docs.api-next`;

    const zoneName = "peterportal.org";

    this.bucket = new Bucket(this, `${id}-destination-bucket`, {
      bucketName: `${recordName}.${zoneName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.originAccessIdentity = new OriginAccessIdentity(this, `${id}-origin-access-identity`);

    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        principals: [
          new CanonicalUserPrincipal(
            this.originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    this.distribution = new Distribution(this, `${id}-distribution`, {
      certificate: Certificate.fromCertificateArn(this, `${id}-certificate`, certificateArn),
      defaultRootObject: "index.html",
      domainNames: [`${recordName}.${zoneName}`],
      defaultBehavior: {
        origin: new S3Origin(this.bucket, {
          originAccessIdentity: this.originAccessIdentity,
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

    this.aRecord = new ARecord(this, `${id}-a-record`, {
      zone: HostedZone.fromHostedZoneAttributes(this, `${id}-hosted-zone`, {
        zoneName,
        hostedZoneId,
      }),
      recordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });

    this.bucketDeployment = new BucketDeployment(this, `${id}-bucket-deployment`, {
      sources: [Source.asset(props.assets)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });
  }
}
