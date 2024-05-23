import type { QuarterDates } from "@anteater-api/types";
import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters ?? {};
  const requestId = context.awsRequestId;

  const maybeParsed = QuerySchema.safeParse(query);

  if (!maybeParsed.success)
    return res.createErrorResult(
      400,
      maybeParsed.error.issues.map((issue) => issue.message).join("; "),
      requestId,
    );

  const { data: where } = maybeParsed;

  if ("year" in where) {
    const result = await prisma.calendarTerm.findFirst({ where });
    return result
      ? res.createOKResult<QuarterDates>(result, headers, requestId)
      : res.createErrorResult(
          400,
          `The requested term, ${where.year} ${where.quarter}, is currently unavailable.`,
          requestId,
        );
  }
  return res.createOKResult(
    await prisma.calendarTerm.findMany({ orderBy: { instructionStart: "asc" } }),
    headers,
    requestId,
  );
}, onWarm);
