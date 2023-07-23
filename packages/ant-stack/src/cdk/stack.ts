import { Duration, Stack } from "aws-cdk-lib";
import {
  ContentHandling,
  EndpointType,
  LambdaIntegration,
  MethodOptions,
  MockIntegration,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Role, RoleProps } from "aws-cdk-lib/aws-iam";
import lambda, { Architecture, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";

import type { AntConfig } from "../config";
import { type InternalHandler, isHttpMethod, warmerRequestBody } from "../lambda-core";

export interface HandlerConfig {
  /**
   * The API route.
   */
  route: string;

  /**
   * Directory on the file system to find the API route.
   */
  directory: string;

  /**
   * Files to exclude.
   * @default ["node_modules"]
   */
  exclude?: string[];

  /**
   * Environment variables specific to the function.
   */
  env?: Record<string, string>;

  /**
   *
   */
  rolePropsMapping?: Record<string, RoleProps>;
}

export class AntStack extends Stack {
  api: RestApi;
  config: AntConfig;
  methodOptions: MethodOptions;
  mockIntegration: MockIntegration;

  constructor(scope: Construct, config: AntConfig) {
    super(scope, `${config.aws.id}-${config.env.stage}`, config.aws.stackProps);

    const recordName = `${config.env.stage === "prod" ? "" : `${config.env.stage}.`}api-next`;

    this.config = config;

    this.api = new RestApi(this, `${config.aws.id}-${config.env.stage}`, {
      domainName: {
        domainName: `${recordName}.${config.aws.zoneName}`,
        certificate: Certificate.fromCertificateArn(
          this,
          "peterportal-cert",
          process.env.CERTIFICATE_ARN ?? "",
        ),
      },
      disableExecuteApiEndpoint: true,
      endpointTypes: [EndpointType.EDGE],
      binaryMediaTypes: ["*/*"],
      restApiName: `${config.aws.id}-${config.env.stage}`,
    });

    this.api.addGatewayResponse(`${config.aws.id}-${config.env.stage}-5xx`, {
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

    this.api.addGatewayResponse(`${config.aws.id}-${config.env.stage}-404`, {
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

    this.api.root.addMethod(
      "OPTIONS",
      (this.mockIntegration = new MockIntegration({
        contentHandling: ContentHandling.CONVERT_TO_TEXT,
        integrationResponses: [
          {
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers":
                "'Apollo-Require-Preflight,Content-Type'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods": "'*'",
            },
            statusCode: "204",
          },
        ],
        requestTemplates: {
          "application/json": '{ "statusCode": 204 }',
        },
      })),
      (this.methodOptions = {
        methodResponses: [{ statusCode: "204" }],
      }),
    );

    new ARecord(this, `${config.aws.id}-${config.env.stage}-a-record`, {
      zone: HostedZone.fromHostedZoneAttributes(this, "peterportal-hosted-zone", {
        zoneName: config.aws.zoneName,
        hostedZoneId: process.env.HOSTED_ZONE_ID ?? "",
      }),
      recordName,
      target: RecordTarget.fromAlias(new ApiGateway(this.api)),
    });
  }

  /**
   * Adds an endpoint to the API.
   */
  async addRoute(handlerConfig: HandlerConfig) {
    let resource = this.api.root;

    handlerConfig.route.split("/").forEach((route) => {
      resource = resource.getResource(route) ?? resource.addResource(route);
    });

    const internalHandlers: Record<string, InternalHandler> = await import(
      `${handlerConfig.directory}/dist/index.js`
    );

    Object.keys(internalHandlers)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        const route = handlerConfig.route.replace(/\//g, "-");

        const functionName = `${this.config.aws.id}-${this.config.env.stage}-${route}-${httpMethod}`;

        const handler = new lambda.Function(this, `${functionName}-handler`, {
          functionName,
          runtime: Runtime.NODEJS_18_X,
          code: Code.fromAsset(handlerConfig.directory, {
            exclude: handlerConfig.exclude ?? ["node_modules"],
          }),
          handler: `${this.config.esbuild.outdir}/${this.config.runtime.nodeRuntimeFile.replace(
            "js",
            httpMethod,
          )}`,
          architecture: Architecture.ARM_64,
          environment: { ...handlerConfig.env, ...this.config.env, STAGE: this.config.env.stage },
          timeout: Duration.seconds(15),
          memorySize: 512,
          role:
            handlerConfig.rolePropsMapping && handlerConfig.rolePropsMapping[route]
              ? new Role(this, `${functionName}-role`, handlerConfig.rolePropsMapping[route])
              : undefined,
        });

        const lambdaIntegration = new LambdaIntegration(handler);

        resource.addMethod(httpMethod, lambdaIntegration);

        const idResource = resource.getResource("{id}") ?? resource.addResource("{id}");

        idResource.addMethod(httpMethod, lambdaIntegration);

        if (httpMethod === "GET") {
          resource.addMethod("HEAD", lambdaIntegration);
          idResource.addMethod("HEAD", lambdaIntegration);
        }

        const warmingTarget = new LambdaFunction(handler, {
          event: RuleTargetInput.fromObject({ body: warmerRequestBody }),
        });

        const ruleName = `${functionName}-warming-rule`;

        const warmingRule = new Rule(this, ruleName, {
          schedule: Schedule.rate(Duration.minutes(5)),
        });

        warmingRule.addTarget(warmingTarget);
      });

    resource.addMethod("OPTIONS", this.mockIntegration, this.methodOptions);

    (resource.getResource("{id}") ?? resource.addResource("{id}")).addMethod(
      "OPTIONS",
      this.mockIntegration,
      this.methodOptions,
    );
  }
}
