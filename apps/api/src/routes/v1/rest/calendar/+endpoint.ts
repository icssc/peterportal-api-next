import { PrismaClient } from "@libs/db";
import { createOKResult, createErrorResult } from "@libs/lambda";
import { createHandler } from "@libs/lambda";
import { getTermDateData } from "@libs/uc-irvine-api/registrar";
import type { Quarter, QuarterDates } from "@peterportal-api/types";
import { ZodError } from "zod";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET = createHandler(async (event, context) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;

  try {
    const where = QuerySchema.parse(query);

    const res = await prisma.calendarTerm.findFirst({
      where,
      select: {
        instructionStart: true,
        instructionEnd: true,
        finalsStart: true,
        finalsEnd: true,
      },
    });

    if (res) {
      return createOKResult<QuarterDates>(res, headers, requestId);
    }

    const termDateData = await getTermDateData(
      where.quarter === "Fall" ? where.year : (parseInt(where.year) - 1).toString(10),
    );

    await prisma.calendarTerm.createMany({
      data: Object.entries(termDateData).map(([term, data]) => ({
        year: term.split(" ")[0],
        quarter: term.split(" ")[1] as Quarter,
        ...data,
      })),
    });

    if (!Object.keys(termDateData).length) {
      return createErrorResult(
        400,
        `The requested term, ${where.year} ${where.quarter}, is currently unavailable.`,
        requestId,
      );
    }

    return createOKResult(termDateData[[where.year, where.quarter].join(" ")], headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
});
