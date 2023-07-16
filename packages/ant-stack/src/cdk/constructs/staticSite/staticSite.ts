import aws_cloudfront from "aws-cdk-lib/aws-cloudfront";
import aws_cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import aws_iam from "aws-cdk-lib/aws-iam";
import aws_s3 from "aws-cdk-lib/aws-s3";
import aws_s3_deployment from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface StaticSiteProps {
  /**
   * Full path to the directory containing the static site assets.
   */
  assets: string;
}

export class StaticSite extends Construct {
  bucket: aws_s3.Bucket;

  distribution: aws_cloudfront.Distribution;

  bucketDeployment: aws_s3_deployment.BucketDeployment;

  originAccessIdentity: aws_cloudfront.OriginAccessIdentity;

  originAccessIdentityPrincipal: aws_iam.CanonicalUserPrincipal;

  origin: aws_cloudfront_origins.S3Origin;

  policyStatement: aws_iam.PolicyStatement;

  constructor(scope: Construct, id: string, readonly props: StaticSiteProps) {
    super(scope, id);

    this.bucket = new aws_s3.Bucket(this, `${id}-destination-bucket`);

    this.originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(
      this,
      `${id}-origin-access-identity`
    );

    this.originAccessIdentityPrincipal = new aws_iam.CanonicalUserPrincipal(
      this.originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    this.policyStatement = new aws_iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [this.bucket.arnForObjects("*")],
      principals: [this.originAccessIdentityPrincipal],
    });

    this.bucket.addToResourcePolicy(this.policyStatement);

    this.origin = new aws_cloudfront_origins.S3Origin(this.bucket, {
      originAccessIdentity: this.originAccessIdentity,
    });

    this.distribution = new aws_cloudfront.Distribution(this, `${id}-distribution`, {
      // certificate: this.certificate --> user should figure this out,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: this.origin,
        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    this.bucketDeployment = new aws_s3_deployment.BucketDeployment(
      this,
      `${id}-bucket-deployment`,
      {
        sources: [aws_s3_deployment.Source.asset(props.assets)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ["/*"],
      }
    );
  }
}
