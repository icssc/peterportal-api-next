import { Duration, Stack, StackProps } from "aws-cdk-lib";
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
                  "arn:aws:dynamodb:::table/peterportal-api-next-websoc-cache",
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
