import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";

import type { PPA_SST_Config } from "../config.js";
import { type InternalHandler, isHttpMethod, warmerRequestBody } from "../lambda-core/index.js";

export interface ApiProps {
  route: string;
  directory: string;
  env?: Record<string, string>;
  exclude?: string[];
  methods?: string[];
}

export class ElysiaStack extends cdk.Stack {
  id: string;

  stage: string;

  api: cdk.aws_apigateway.RestApi;

  constructor(scope: Construct, id: string, props: cdk.StackProps = {}, stage: string) {
    // const recordName = `${stage === "prod" ? "" : `${stage}.`}api-next`;

    // const zoneName = "peterportal.org";

    super(scope, `${id}-${stage}`, props);

    this.id = id;

    this.stage = stage;

    this.api = new cdk.aws_apigateway.RestApi(this, `${id}-${stage}`, {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowHeaders: ["Apollo-Require-Preflight", "Content-Type"],
        allowMethods: ["GET", "HEAD", "POST"],
      },
      // domainName: {
      //   domainName: `${recordName}.${zoneName}`,
      //   certificate: Certificate.fromCertificateArn(this, "peterportal-cert", certificateArn),
      // },
      // disableExecuteApiEndpoint: true,
      endpointTypes: [cdk.aws_apigateway.EndpointType.EDGE],
      minCompressionSize: cdk.Size.bytes(128 * 1024), // 128 KiB
      restApiName: `${id}-${stage}`,
    });

    this.api.addGatewayResponse(`${id}-${stage}-5xx`, {
      type: cdk.aws_apigateway.ResponseType.DEFAULT_5XX,
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

    this.api.addGatewayResponse(`${id}-${stage}-404`, {
      type: cdk.aws_apigateway.ResponseType.MISSING_AUTHENTICATION_TOKEN,
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

    // new cdk.aws_route53.ARecord(this, `${id}-a-record-${stage}`, {
    //   zone: cdk.aws_route53.HostedZone.fromHostedZoneAttributes(this, "${id}-hosted-zone", {
    //     zoneName,
    //     hostedZoneId,
    //   }),
    //   recordName,
    //   target: cdk.aws_route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.ApiGateway(this.api)),
    // });
  }

  /**
   * Adds an endpoint to the API.
   */
  async addRoute(apiProps: ApiProps, config: PPA_SST_Config) {
    let resource = this.api.root;

    apiProps.route.split("/").forEach((route) => {
      resource = resource.getResource(route) ?? resource.addResource(route);
    });

    const internalHandlers: Record<string, InternalHandler> = await import(
      `${apiProps.directory}/src/index`
    );

    Object.keys(internalHandlers)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        const route = apiProps.route.replace(/\//g, "-");

        const functionName = `${this.id}-${this.stage}-${route}-${httpMethod}`;

        const handler = new cdk.aws_lambda.Function(this, `${functionName}-handler`, {
          functionName,
          runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
          code: cdk.aws_lambda.Code.fromAsset(apiProps.directory, {
            exclude: apiProps.exclude ?? ["node_modules"],
          }),
          handler: `${config.esbuild.outdir}/${config.runtime.nodeRuntimeFile.replace(
            "js",
            httpMethod
          )}`,
          architecture: cdk.aws_lambda.Architecture.ARM_64,
          environment: { ...apiProps.env, stage: this.stage },
          timeout: cdk.Duration.seconds(15),
          memorySize: 512,
        });

        const lambdaIntegration = new cdk.aws_apigateway.LambdaIntegration(handler);

        resource.addMethod(httpMethod, lambdaIntegration);

        const warmingTarget = new cdk.aws_events_targets.LambdaFunction(handler, {
          event: cdk.aws_events.RuleTargetInput.fromObject({ body: warmerRequestBody }),
        });

        const ruleName = `${functionName}-warming-rule`;

        const warmingRule = new cdk.aws_events.Rule(this, ruleName, {
          ruleName,
          schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(5)),
        });

        warmingRule.addTarget(warmingTarget);
      });
  }
}
