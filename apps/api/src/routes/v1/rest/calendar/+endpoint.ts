import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import { getTermDateData } from "@libs/uc-irvine-lib/registrar";
import type { Quarter, QuarterDates } from "@peterportal-api/types";
import { ZodError } from "zod";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;

  try {
    const where = QuerySchema.parse(query);

    const result = await prisma.calendarTerm.findFirst({
      where,
      select: {
        instructionStart: true,
        instructionEnd: true,
        finalsStart: true,
        finalsEnd: true,
      },
    });

    if (result) {
      return res.createOKResult<QuarterDates>(result, headers, requestId);
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
      return res.createErrorResult(
        400,
        `The requested term, ${where.year} ${where.quarter}, is currently unavailable.`,
        requestId,
      );
    }

    return res.createOKResult(
      termDateData[[where.year, where.quarter].join(" ")],
      headers,
      requestId,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, error, requestId);
  }
}, onWarm);
