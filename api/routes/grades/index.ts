import { PrismaClient } from "@libs/db";
import type { IRequest } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import type { GradesRaw } from "peterportal-api-next-types";
import { ZodError } from "zod";

import { aggregateGrades, constructPrismaQuery } from "./lib";
import { QuerySchema } from "./schema";

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, params, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  const prisma = new PrismaClient();
  switch (method) {
    case "HEAD":
    case "GET":
      try {
        const parsedQuery = QuerySchema.parse(query);
        const res = (
          await prisma.gradesSection.findMany({
            where: constructPrismaQuery(parsedQuery),
            include: { instructors: true },
          })
        ).map((section) => ({
          ...section,
          instructors: section.instructors.map((instructor) => instructor.name),
        }));
        switch (params?.id) {
          case "raw":
            return createOKResult<GradesRaw>(res, requestId);
          case "aggregate":
            return createOKResult(aggregateGrades(res), requestId);
        }
        return createErrorResult(
          400,
          `Invalid sub-resource ${params?.id}`,
          requestId
        );
      } catch (e) {
        if (e instanceof ZodError) {
          const messages = e.issues.map((issue) => issue.message);
          return createErrorResult(400, messages.join("; "), requestId);
        }
        // findMany failing due to too many placeholders
        if (e instanceof Error && e.message.includes("1390")) {
          return createErrorResult(
            400,
            "Your query returned too many entries. Please refine your search.",
            requestId
          );
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
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
