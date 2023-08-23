import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Duration, StackProps } from "aws-cdk-lib";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class WebsocProxyService extends Construct {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id);
    const ruleName = "peterportal-api-next-prod-websoc-proxy-service-warming-rule";
    const rule = new Rule(this, ruleName, {
      ruleName,
      schedule: Schedule.rate(Duration.minutes(5)),
    });
    const functionName = "peterportal-api-next-prod-websoc-proxy-service";
    rule.addTarget(
      new LambdaFunction(
        new Function(this, functionName, {
          code: Code.fromAsset(
            join(dirname(fileURLToPath(import.meta.url)), "../../../websoc-proxy-service/dist"),
          ),
          functionName,
          handler: "index.handler",
          timeout: Duration.seconds(15),
          runtime: Runtime.NODEJS_18_X,
          memorySize: 512,
          ...props,
        }),
        {
          event: RuleTargetInput.fromObject({ body: '{"warmer":"true"}' }),
        },
      ),
    );
  }
}
