import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { DDBDocClient, Key } from "ddb";
import { geCategories } from "peterportal-api-next-types";
import { getDepts } from "websoc-api-next";

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  if (!event.body) throw new Error("Payload not provided");
  const { term } = JSON.parse(event.body);
  if (!term) throw new Error("Malformed payload");
  const termString = `${term.year}-${term.quarter.toLowerCase()}`;
  const tables: Record<string, Key[]> = {
    "peterportal-api-next-websoc-instructors-by-term": [
      {
        name: "term",
        type: ScalarAttributeType.S,
      },
    ],
    [`peterportal-api-next-websoc-${termString}-by-section-code`]: [
      {
        name: "sectionCode",
        type: ScalarAttributeType.S,
      },
    ],
    [`peterportal-api-next-websoc-${termString}-by-department`]: [
      {
        name: "deptCode",
        type: ScalarAttributeType.S,
      },
      {
        name: "sectionCode",
        type: ScalarAttributeType.S,
      },
    ],
    [`peterportal-api-next-websoc-${termString}-by-instructor`]: [
      {
        name: "instructor",
        type: ScalarAttributeType.S,
      },
      {
        name: "sectionCode",
        type: ScalarAttributeType.S,
      },
    ],
    [`peterportal-api-next-websoc-${termString}-by-ge`]: [
      {
        name: "geCategory",
        type: ScalarAttributeType.S,
      },
      {
        name: "sectionCode",
        type: ScalarAttributeType.S,
      },
    ],
  };
  const missingTables: string[] = [];
  const docClient = new DDBDocClient();
  for (const tableName of Object.keys(tables)) {
    try {
      await docClient.describeTable(tableName);
    } catch {
      missingTables.push(tableName);
    }
  }
  for (const tableName of missingTables) {
    await docClient.createTable(
      tableName,
      tables[tableName][0],
      tables[tableName][1]
    );
  }
  const lambdaClient = new LambdaClient({
    /* eslint-disable turbo/no-undeclared-env-vars */
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    /* eslint-enable */
  });
  await docClient.put("peterportal-api-next-websoc-instructors-by-term", {
    term,
    instructors: Array.from(
      new Set(
        (
          await Promise.all([
            ...(
              await getDepts()
            ).map((x) =>
              lambdaClient.send(
                new InvokeCommand({
                  FunctionName: "peterportal-api-next-websoc-scraper-child",
                  Payload: JSON.stringify({
                    term,
                    department: x.deptValue,
                  }) as unknown as Uint8Array,
                })
              )
            ),
            ...Object.keys(geCategories).map((ge) =>
              lambdaClient.send(
                new InvokeCommand({
                  FunctionName: "peterportal-api-next-websoc-scraper-child",
                  Payload: JSON.stringify({
                    term,
                    ge,
                  }) as unknown as Uint8Array,
                })
              )
            ),
          ])
        )
          .map(
            (x) =>
              (x.Payload
                ? JSON.parse(Buffer.from(x.Payload).toString())
                : []) as string[]
          )
          .flat()
      )
    ),
  });
  return {
    statusCode: 200,
    body: "",
  };
};
