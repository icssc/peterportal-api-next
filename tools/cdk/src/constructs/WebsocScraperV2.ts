import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import lambda, { Architecture, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class WebsocScraperV2 extends Construct {
  constructor(scope: Construct, id: string, vpc: IVpc) {
    if (!process.env.DATABASE_URL_WEBSOC_SCRAPER)
      throw new Error("Scraper database URL not provided. Stop.");
    super(scope, id);
    const clusterName = `${id}-cluster`;
    const cluster = new Cluster(this, clusterName, { clusterName, vpc });
    const taskDefinition = new FargateTaskDefinition(this, `${id}-taskdef`, {
      cpu: 256,
      memoryLimitMiB: 2048,
    });
    taskDefinition.addContainer(`${id}-container`, {
      containerName: `${id}-container`,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL_WEBSOC_SCRAPER,
        NODE_ENV: "production",
        NODE_OPTIONS: "--max-old-space-size=2048",
        TZ: "America/Los_Angeles",
      },
      image: ContainerImage.fromAsset(
        join(dirname(fileURLToPath(import.meta.url)), "../../../../services/websoc-scraper-v2/"),
      ),
      logging: LogDriver.awsLogs({
        logGroup: new LogGroup(this, `${id}-log-group`, {
          logGroupName: `/aws/ecs/cluster/${id}`,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        streamPrefix: "/aws/ecs/container",
      }),
    });
    new FargateService(this, `${id}-service`, {
      assignPublicIp: true,
      cluster,
      taskDefinition,
    });
    /**
     * The original implementation of this function is as follows:
     * ```ts
     * import {
     *   DescribeTasksCommand,
     *   ECSClient,
     *   ListClustersCommand,
     *   ListTasksCommand,
     *   StopTaskCommand,
     * } from "@aws-sdk/client-ecs";
     *
     * export async function handler() {
     *   const client = new ECSClient();
     *   const { clusterArns } = await client.send(new ListClustersCommand({}));
     *   const cluster = clusterArns?.filter((x) => x.includes("websoc-scraper-v2"))[0];
     *   const { taskArns } = await client.send(new ListTasksCommand({ cluster }));
     *   const { tasks } = await client.send(new DescribeTasksCommand({ cluster, tasks: taskArns }));
     *   await Promise.all(
     *     tasks
     *       ?.filter((x) => x.startedAt && x.startedAt.valueOf() + 60 * 60 * 1000 < Date.now())
     *       .map((x) => client.send(new StopTaskCommand({ cluster, task: x.taskArn }))) ?? [],
     *   );
     * }
     * ```
     */
    const fn = new lambda.Function(this, `${id}-auto-restart`, {
      code: Code.fromInline(
        'var{DescribeTasksCommand:a,ECSClient:e,ListClustersCommand:s,ListTasksCommand:t,StopTaskCommand:n}=require("@aws-sdk/client-ecs");exports.h=async _=>{let d=new e,{clusterArns:i}=await d.send(new s({})),l=i?.filter(a=>a.includes("websoc-scraper-v2"))[0],{taskArns:r}=await d.send(new t({cluster:l})),{tasks:c}=await d.send(new a({cluster:l,tasks:r}));await Promise.all(c?.filter(a=>a.startedAt&&a.startedAt.valueOf()+36e5<Date.now()).map(a=>d.send(new n({cluster:l,task:a.taskArn})))??[])};',
      ),
      handler: "index.h",
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      role: new Role(this, `${id}-auto-restart-role`, {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        ],
        inlinePolicies: {
          ecsPolicy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                resources: ["*"],
                actions: ["ecs:DescribeTasks", "ecs:ListClusters", "ecs:ListTasks", "ecs:StopTask"],
              }),
            ],
          }),
        },
      }),
    });
    const ruleName = `${id}-auto-restart-rule`;
    const rule = new Rule(this, ruleName, { schedule: Schedule.rate(Duration.minutes(15)) });
    rule.addTarget(new LambdaFunction(fn));
  }
}
