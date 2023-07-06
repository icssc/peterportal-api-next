import { PrismaClient } from "@libs/db";
import { getTermDateData } from "@libs/registrar-api";
import type { InternalHandler } from "ant-stack";
import { createErrorResult, createOKResult } from "ant-stack";
import { Quarter, QuarterDates } from "peterportal-api-next-types";
import { ZodError } from "zod";

import { QuerySchema } from "./schema";

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { query, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }

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
      return createOKResult<QuarterDates>(res, requestId);
    }

    const termDateData = await getTermDateData(
      where.quarter === "Fall" ? where.year : (parseInt(where.year) - 1).toString(10)
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
        requestId
      );
    }

    return createOKResult(termDateData[[where.year, where.quarter].join(" ")], requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
};
