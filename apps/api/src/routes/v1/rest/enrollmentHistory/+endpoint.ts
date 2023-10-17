import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { EnrollmentHistory } from "@peterportal-api/types";
import type { APIGatewayProxyHandler } from "aws-lambda";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const { headers, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  const maybeParsed = QuerySchema.safeParse(query);
  if (!maybeParsed.success) {
    return createErrorResult(400, maybeParsed.error, requestId);
  }
  const { data: where } = maybeParsed;

  return createOKResult<EnrollmentHistory[]>(
    (await prisma.websocEnrollmentHistory.findMany({ where })).map((x) => {
      const { timestamp: _, ...obj } = x;
      return obj as unknown as EnrollmentHistory;
    }),
    headers,
    requestId,
  );
};
