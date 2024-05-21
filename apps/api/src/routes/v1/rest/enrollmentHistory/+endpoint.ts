import type { EnrollmentHistory } from "@anteater-api/types";
import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

import { transformResults } from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET = createHandler(async (event, context, res) => {
  const { headers, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  const maybeParsed = QuerySchema.safeParse(query);
  if (!maybeParsed.success) {
    return res.createErrorResult(
      400,
      maybeParsed.error.issues.map((issue) => issue.message).join("; "),
      requestId,
    );
  }
  const {
    data: { instructor, ...data },
  } = maybeParsed;

  const sections = await prisma.websocEnrollmentHistory.findMany({
    where: {
      ...data,
      ...(instructor && { instructors: { has: instructor } }),
    },
    include: { entries: true },
    take: 6000,
  });

  return res.createOKResult<EnrollmentHistory[]>(transformResults(sections), headers, requestId);
});
