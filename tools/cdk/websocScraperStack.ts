import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  RoleProps,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export class WebsocScraperStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const parentInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:aws:lambda:us-east-1:${process.env.ACCOUNT_ID}:function:peterportal-api-next-websoc-scraper-parent`,
      ],
      actions: ["lambda:InvokeFunction"],
    });
    const childInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:aws:lambda:us-east-1:${process.env.ACCOUNT_ID}:function:peterportal-api-next-websoc-scraper-child`,
      ],
      actions: ["lambda:InvokeFunction"],
    });
    const ddbAccessPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:aws:dynamodb:us-east-1:${process.env.ACCOUNT_ID}:table/peterportal-api-next-websoc-*`,
      ],
      actions: [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
      ],
    });
    const roleProps: RoleProps = {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    };
    const mainRole = new Role(
      this,
      "peterportal-api-next-websoc-scraper-main-role",
      roleProps
    );
    mainRole.addToPolicy(parentInvokePolicy);
    const parentRole = new Role(
      this,
      "peterportal-api-next-websoc-scraper-parent-role",
      roleProps
    );
    parentRole.addToPolicy(childInvokePolicy);
    parentRole.addToPolicy(ddbAccessPolicy);
    const childRole = new Role(
      this,
      "peterportal-api-next-websoc-scraper-child-role",
      roleProps
    );
    childRole.addToPolicy(ddbAccessPolicy);
    for (const [name, [memorySize, role, timeout]] of Object.entries({
      main: [1024, mainRole, Duration.minutes(1)],
      parent: [1024, parentRole, Duration.minutes(1)],
      child: [1024, childRole, Duration.minutes(1)],
    } as Record<string, [number, Role, Duration]>)) {
      const functionName = `peterportal-api-next-websoc-scraper-${name}`;
      new Function(this, functionName, {
        code: Code.fromAsset(
          join(
            dirname(fileURLToPath(import.meta.url)),
            `../websoc-scraper/dist/${name}/`
          )
        ),
        functionName,
        handler: "index.handler",
        memorySize,
        role,
        runtime: Runtime.NODEJS_16_X,
        timeout,
      });
    }
  }
}
