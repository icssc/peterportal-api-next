import * as aws_cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as aws_cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as aws_iam from "aws-cdk-lib/aws-iam";
import * as aws_s3 from "aws-cdk-lib/aws-s3";
import * as aws_s3_deployment from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface StaticSiteProps {
  /**
   * Full path to the directory containing the static site assets.
   */
  assets: string;

  /**
   * Override props passed to constructs.
   */
  constructs?: Partial<StaticSiteConstructProps>;
}

export interface StaticSiteConstructProps {
  bucketProps: (scope: StaticSite, id: string) => aws_s3.BucketProps;

  oaiProps: (scope: StaticSite, id: string) => aws_cloudfront.OriginAccessIdentityProps;

  policyStatementProps: (scope: StaticSite, id: string) => aws_iam.PolicyStatementProps;

  originProps: (scope: StaticSite, id: string) => aws_cloudfront_origins.S3OriginProps;

  distributionProps: (scope: StaticSite, id: string) => aws_cloudfront.DistributionProps;

  bucketDeploymentProps: (scope: StaticSite, id: string) => aws_s3_deployment.BucketDeploymentProps;
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

    const bucketProps = props.constructs?.bucketProps?.(this, id);

    this.bucket = new aws_s3.Bucket(this, `${id}-destination-bucket`, bucketProps);

    const oaiProps = props.constructs?.oaiProps?.(this, id);

    this.originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(
      this,
      `${id}-origin-access-identity`,
      oaiProps
    );

    this.originAccessIdentityPrincipal = new aws_iam.CanonicalUserPrincipal(
      this.originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    const policyStatementProps = props.constructs?.policyStatementProps?.(this, id);

    const defaultPolicyStatementProps: aws_iam.PolicyStatementProps = {
      actions: ["s3:GetObject"],
      resources: [this.bucket.arnForObjects("*")],
      principals: [this.originAccessIdentityPrincipal],
    };

    this.policyStatement = new aws_iam.PolicyStatement(
      policyStatementProps ?? defaultPolicyStatementProps
    );

    this.bucket.addToResourcePolicy(this.policyStatement);

    const originProps = props.constructs?.originProps?.(this, id);

    const defaultOriginProps: aws_cloudfront_origins.S3OriginProps = {
      originAccessIdentity: this.originAccessIdentity,
    };

    this.origin = new aws_cloudfront_origins.S3Origin(
      this.bucket,
      originProps ?? defaultOriginProps
    );

    const distributionProps = props.constructs?.distributionProps?.(this, id);

    const defaultDistributionProps: aws_cloudfront.DistributionProps = {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: this.origin,
        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    };

    this.distribution = new aws_cloudfront.Distribution(
      this,
      `${id}-distribution`,
      distributionProps ?? defaultDistributionProps
    );

    const bucketDeploymentProps = props.constructs?.bucketDeploymentProps?.(this, id);

    const defaultBucketDeploymentProps: aws_s3_deployment.BucketDeploymentProps = {
      sources: [aws_s3_deployment.Source.asset(props.assets)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    };

    this.bucketDeployment = new aws_s3_deployment.BucketDeployment(
      this,
      `${id}-bucket-deployment`,
      bucketDeploymentProps ?? defaultBucketDeploymentProps
    );
  }
}
