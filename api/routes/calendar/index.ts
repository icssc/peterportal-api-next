import { ZodError } from "zod";
import type { IRequest } from "api-core";
import { createErrorResult, createLambdaHandler, createOKResult } from "api-core";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Quarter, QuarterDates } from "peterportal-api-next-types";
import { getTermDateData } from "@libs/registrar-api";
import { PrismaClient } from "@libs/db";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const rawHandler = async (request: IRequest): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  if (request.isWarmerRequest()) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }
  switch (method) {
    case "HEAD":
    case "GET":
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
        if (res) return createOKResult<QuarterDates>(res, requestId);
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
        if (!Object.keys(termDateData).length)
          return createErrorResult(
            400,
            `The requested term, ${where.year} ${where.quarter}, is currently unavailable.`,
            requestId
          );
        return createOKResult(termDateData[[where.year, where.quarter].join(" ")], requestId);
      } catch (e) {
        if (e instanceof ZodError) {
          const messages = e.issues.map((issue) => issue.message);
          return createErrorResult(400, messages.join("; "), requestId);
        }
        return createErrorResult(400, e, requestId);
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => createLambdaHandler(rawHandler)(event, context);
