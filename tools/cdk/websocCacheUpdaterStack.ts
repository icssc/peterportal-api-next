import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class WebsocCacheUpdaterStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const tableName = "peterportal-api-next-websoc-cache";
    new Table(this, tableName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      tableName,
      timeToLiveAttribute: "invalidateBy",
      partitionKey: {
        name: "requestHash",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey: {
        name: "invalidateBy",
        type: AttributeType.NUMBER,
      },
    });
    const functionName = "peterportal-api-next-websoc-cache-updater";
    new Function(this, functionName, {
      code: Code.fromAsset(
        join(
          dirname(fileURLToPath(import.meta.url)),
          `../websoc-cache-updater/dist/`
        )
      ),
      functionName,
      handler: "index.handler",
      memorySize: 512,
      role: new Role(this, "peterportal-api-next-websoc-cache-updater-role", {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
        inlinePolicies: {
          ddbPutPolicy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                  `arn:aws:dynamodb:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:table/peterportal-api-next-websoc-cache`,
                ],
                actions: ["dynamodb:PutItem"],
              }),
            ],
          }),
        },
      }),
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(15),
    });
  }
}
