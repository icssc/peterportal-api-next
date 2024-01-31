import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import type { EnrollmentHistory } from "@peterportal-api/types";

import { QuerySchema } from "./schema";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const prisma = new PrismaClient();

export const GET = createHandler(async (event, context, res) => {
  const { headers, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  const maybeParsed = QuerySchema.safeParse(query);
  if (!maybeParsed.success) {
    return res.createErrorResult(400, maybeParsed.error, requestId);
  }
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { instructor, ...data },
  } = maybeParsed;

  return res.createOKResult<EnrollmentHistory[]>([], headers, requestId);
});
