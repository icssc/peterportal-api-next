import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  EndpointType,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Code, Function, FunctionProps, Runtime } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class ApiStack extends Stack {
  private api: RestApi;
  private rule: Rule;
  private readonly env: Record<string, string>;
  private readonly functions: Record<string, lambda.Function> = {};
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
      nodeEnv: process.env.NODE_ENV,
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
   * @param props Any props to pass to the Lambda handler.
   */
  public addRoute(
    path: string,
    name: string,
    props?: Partial<FunctionProps>
  ): void {
    let resource = this.api.root;
    for (const pathPart of path.slice(1).split("/")) {
      resource =
        resource.getResource(pathPart) ?? resource.addResource(pathPart);
    }
    const functionName = `peterportal-api-next-${this.env.stage}-${name}-handler`;
    resource.addMethod(
      "ANY",
      this.integrations[functionName] ??
        (this.integrations[functionName] = new LambdaIntegration(
          (this.functions[functionName] = new Function(this, functionName, {
            code: Code.fromAsset(
              join(
                dirname(fileURLToPath(import.meta.url)),
                `../routes/${name}/dist`
              )
            ),
            environment: {
              DATABASE_URL: this.env.databaseUrl,
              STAGE: this.env.stage,
              NODE_ENV: this.env.nodeEnv,
            },
            functionName,
            handler: `index.lambdaHandler`,
            timeout: Duration.seconds(15),
            runtime: Runtime.NODEJS_16_X,
            memorySize: 512,
            ...props,
          }))
        ))
    );
    this.rule.addTarget(
      new LambdaFunction(this.functions[functionName], {
        event: RuleTargetInput.fromObject({ warmer: true }),
      })
    );
  }

  private setupAPI(): void {
    const { certificateArn, hostedZoneId, stage } = this.env;
    const recordName = `${stage === "prod" ? "" : `${stage}.`}api-next`;
    const zoneName = "peterportal.org";

    const api = new RestApi(this, `peterportal-api-next-${stage}`, {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowHeaders: ["Apollo-Require-Preflight", "Content-Type"],
        allowMethods: ["GET", "HEAD", "POST"],
      },
      disableExecuteApiEndpoint: true,
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

    this.rule = new Rule(this, `peterportal-api-next-${stage}-warming-rule`, {
      schedule: Schedule.rate(Duration.minutes(5)),
    });
  }
}
