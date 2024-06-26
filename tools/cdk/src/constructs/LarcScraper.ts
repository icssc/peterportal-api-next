import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Duration } from "aws-cdk-lib";
import { Rule, RuleTargetInput, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Architecture, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class LarcScraper extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const ruleName = `${id}-rule`;

    const rule = new Rule(this, ruleName, {
      ruleName,
      schedule: Schedule.rate(Duration.days(1)),
    });

    const functionName = `${id}-function`;

    rule.addTarget(
      new LambdaFunction(
        new Function(this, functionName, {
          architecture: Architecture.ARM_64,
          code: Code.fromAsset(
            join(dirname(fileURLToPath(import.meta.url)), "../../../../services/larc-scraper/dist"),
          ),
          functionName,
          handler: "index.handler",
          timeout: Duration.seconds(15),
          runtime: Runtime.NODEJS_20_X,
          memorySize: 512,
        }),
        {
          event: RuleTargetInput.fromObject({ body: "{}" }),
        },
      ),
    );
  }
}
