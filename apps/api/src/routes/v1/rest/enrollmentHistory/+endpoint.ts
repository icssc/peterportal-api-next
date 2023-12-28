import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import type { EnrollmentHistory } from "@peterportal-api/types";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET = createHandler(async (event, context, res) => {
  const { headers, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  const maybeParsed = QuerySchema.safeParse(query);
  if (!maybeParsed.success) {
    return res.createErrorResult(400, maybeParsed.error, requestId);
  }
  const {
    data: { instructor, ...data },
  } = maybeParsed;

  return res.createOKResult<EnrollmentHistory[]>(
    (
      await prisma.websocEnrollmentHistory.findMany({
        where: {
          ...data,
          courseNumber: data.courseNumber?.toUpperCase(),
          instructors: { array_contains: instructor },
        },
      })
    ).map((x) => {
      const { timestamp: _, ...obj } = x;
      return obj as unknown as EnrollmentHistory;
    }),
    headers,
    requestId,
  );
});
