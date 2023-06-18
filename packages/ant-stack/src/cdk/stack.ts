import * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'

import type { AntConfig } from '../config.js'
import { type InternalHandler, isHttpMethod, warmerRequestBody } from '../lambda-core/index.js'

export interface HandlerConfig {
  /**
   * The API route.
   */
  route: string

  /**
   * Directory on the file system to find the API route.
   */
  directory: string

  /**
   * Files to exclude.
   * @default ["node_modules"]
   */
  exclude?: string[]

  /**
   * Environment variables specific to the function.
   */
  env?: Record<string, string>
}

export class PeterPortalAPI_SST_Stack extends cdk.Stack {
  api: cdk.aws_apigateway.RestApi

  config: AntConfig

  constructor(scope: Construct, config: AntConfig) {
    super(scope, `${config.aws.id}-${config.aws.stage}`, config.aws.stackProps)

    const recordName = `${config.aws.stage === 'prod' ? '' : `${config.aws.stage}.`}api-next`

    this.config = config

    this.api = new cdk.aws_apigateway.RestApi(this, `${config.aws.id}-${config.aws.stage}`, {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowHeaders: ['Apollo-Require-Preflight', 'Content-Type'],
        allowMethods: ['GET', 'HEAD', 'POST'],
      },
      domainName: {
        domainName: `${recordName}.${config.aws.zoneName}`,
        certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this,
          'peterportal-cert',
          config.env?.certificateArn
        ),
      },
      disableExecuteApiEndpoint: true,
      endpointTypes: [cdk.aws_apigateway.EndpointType.EDGE],
      minimumCompressionSize: 128 * 1024, // 128 KiB
      restApiName: `${config.aws.id}-${config.aws.stage}`,
    })

    this.api.addGatewayResponse(`${config.aws.id}-${config.aws.stage}-5xx`, {
      type: cdk.aws_apigateway.ResponseType.DEFAULT_5XX,
      statusCode: '500',
      templates: {
        'application/json': JSON.stringify({
          timestamp: '$context.requestTime',
          requestId: '$context.requestId',
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An unknown error has occurred. Please try again.',
        }),
      },
    })

    this.api.addGatewayResponse(`${config.aws.id}-${config.aws.stage}-404`, {
      type: cdk.aws_apigateway.ResponseType.MISSING_AUTHENTICATION_TOKEN,
      statusCode: '404',
      templates: {
        'application/json': JSON.stringify({
          timestamp: '$context.requestTime',
          requestId: '$context.requestId',
          statusCode: 404,
          error: 'Not Found',
          message: 'The requested resource could not be found.',
        }),
      },
    })

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
  async addRoute(handlerConfig: HandlerConfig) {
    let resource = this.api.root

    handlerConfig.route.split('/').forEach((route) => {
      resource = resource.getResource(route) ?? resource.addResource(route)
    })

    const internalHandlers: Record<string, InternalHandler> = await import(
      `${handlerConfig.directory}/src/index`
    )

    Object.keys(internalHandlers)
      .filter(isHttpMethod)
      .forEach((httpMethod) => {
        const route = handlerConfig.route.replace(/\//g, '-')

        const functionName = `${this.config.aws.id}-${this.config.aws.stage}-${route}-${httpMethod}`

        const handler = new cdk.aws_lambda.Function(this, `${functionName}-handler`, {
          functionName,
          runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
          code: cdk.aws_lambda.Code.fromAsset(handlerConfig.directory, {
            exclude: handlerConfig.exclude ?? ['node_modules'],
          }),
          handler: `${this.config.esbuild.outdir}/${this.config.runtime.nodeRuntimeFile.replace(
            'js',
            httpMethod
          )}`,
          architecture: cdk.aws_lambda.Architecture.ARM_64,
          environment: { ...handlerConfig.env, ...this.config.env, stage: this.config.aws.stage },
          timeout: cdk.Duration.seconds(15),
          memorySize: 512,
        })

        const lambdaIntegration = new cdk.aws_apigateway.LambdaIntegration(handler)

        resource.addMethod(httpMethod, lambdaIntegration)

        const warmingTarget = new cdk.aws_events_targets.LambdaFunction(handler, {
          event: cdk.aws_events.RuleTargetInput.fromObject({ body: warmerRequestBody }),
        })

        const ruleName = `${functionName}-warming-rule`

        const warmingRule = new cdk.aws_events.Rule(this, ruleName, {
          ruleName,
          schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(5)),
        })

        warmingRule.addTarget(warmingTarget)
      })
  }
}
