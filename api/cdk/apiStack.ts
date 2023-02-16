import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  EndpointType,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class ApiStack extends Stack {
  private api: RestApi;
  private readonly env: Record<string, string>;
  private readonly integrations: Record<string, LambdaIntegration> = {};
  private readonly props: StackProps;

  constructor(scope: Construct, id: string) {
    if (!process.env.CERTIFICATE_ARN)
      throw new Error("Certificate ARN not provided. Stop.");
    if (!process.env.DATABASE_URL)
      throw new Error("Database URL not provided. Stop.");
    if (!process.env.HOSTED_ZONE_ID)
      throw new Error("Hosted Zone ID not provided. Stop.");

    let stage: string;
    switch (process.env.NODE_ENV) {
      case "production":
        stage = "prod";
        break;
      case "staging":
        if (!process.env.PR_NUM)
          throw new Error(
            "Running in staging environment but no PR number specified. Stop."
          );
        stage = `staging-${process.env.PR_NUM}`;
        break;
      case "development":
        throw new Error(
          "Cannot deploy stack in development environment. Stop."
        );
      default:
        throw new Error("Invalid environment specified. Stop.");
    }

    const props: StackProps = {
      env: { region: "us-east-1" },
      terminationProtection: /*stage === "prod"*/ false,
    };

    const env = {
      certificateArn: process.env.CERTIFICATE_ARN,
      databaseUrl: process.env.DATABASE_URL,
      hostedZoneId: process.env.HOSTED_ZONE_ID,
      stage,
    };
    super(scope, `${id}-${stage}`, props);

    this.props = props;
    this.env = env;

    this.setupAPI();
  }

  /**
   * Adds an endpoint to the API.
   * @param path The absolute path of the endpoint.
   * @param name The short name of the module that handles the endpoint.
   */
  public addRoute(path: string, name: string): void {
    let resource = this.api.root;
    for (const pathPart of path.slice(1).split("/")) {
      resource =
        resource.getResource(pathPart) ?? resource.addResource(pathPart);
    }
    const id = `peterportal-api-next-${this.env.stage}-${name}-handler`;
    resource.addMethod(
      "ANY",
      this.integrations[id] ??
        (this.integrations[id] = new LambdaIntegration(
          new Function(this, id, {
            runtime: Runtime.NODEJS_16_X,
            code: Code.fromAsset(
              join(
                dirname(fileURLToPath(import.meta.url)),
                `../routes/${name}/dist`
              )
            ),
            handler: `${name}.lambdaHandler`,
            environment: {
              DATABASE_URL: this.env.databaseUrl,
            },
            timeout: Duration.seconds(15),
            memorySize: 512,
          })
        ))
    );
  }

  private setupAPI(): void {
    const { certificateArn, hostedZoneId, stage } = this.env;
    const recordName = `${stage === "prod" ? "" : `${stage}-`}api-next`;
    const zoneName = "peterportal.org";

    const api = new RestApi(this, `peterportal-api-next-${stage}`, {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "HEAD", "POST"],
      },
      domainName: {
        domainName: `${recordName}.${zoneName}`,
        certificate: Certificate.fromCertificateArn(
          this,
          "peterportal-cert",
          certificateArn
        ),
      },
      endpointTypes: [EndpointType.EDGE],
      minimumCompressionSize: 128 * 1024, // 128 KiB
      restApiName: `peterportal-api-next-${stage}`,
    });

    new ARecord(this, `peterportal-api-next-a-record-${stage}`, {
      zone: HostedZone.fromHostedZoneAttributes(
        this,
        "peterportal-hosted-zone",
        {
          zoneName,
          hostedZoneId,
        }
      ),
      recordName,
      target: RecordTarget.fromAlias(new ApiGateway(api)),
    });

    api.addGatewayResponse(`peterportal-api-next-${stage}-5xx`, {
      type: ResponseType.DEFAULT_5XX,
      statusCode: "500",
      templates: {
        "application/json": JSON.stringify({
          timestamp: "$context.requestTime",
          requestId: "$context.requestId",
          statusCode: 500,
          error: "Internal Server Error",
          message: "An unknown error has occurred. Please try again.",
        }),
      },
    });

    api.addGatewayResponse(`peterportal-api-next-${stage}-404`, {
      type: ResponseType.MISSING_AUTHENTICATION_TOKEN,
      statusCode: "404",
      templates: {
        "application/json": JSON.stringify({
          timestamp: "$context.requestTime",
          requestId: "$context.requestId",
          statusCode: 404,
          error: "Not Found",
          message: "The requested resource could not be found.",
        }),
      },
    });

    this.api = api;
  }
}
