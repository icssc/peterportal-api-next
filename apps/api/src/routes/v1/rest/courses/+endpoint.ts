import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { ZodError } from "zod";

import { constructPrismaQuery, normalizeCourse } from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;

  /**
   * TODO: handle warmer requests.
   */

  // if (request.isWarmerRequest) {
  //   try {
  //     await prisma.$connect();
  //     return createOKResult("Warmed", headers, requestId);
  //   } catch (e) {
  //     createErrorResult(500, e, requestId);
  //   }
  // }

  try {
    const parsedQuery = QuerySchema.parse(query);
    // The query object being empty shouldn't return all courses, since there's /courses/all for that.
    if (!Object.keys(parsedQuery).length) {
      return createErrorResult(400, "Course number not provided", requestId);
    }

    const courses = await prisma.course.findMany({ where: constructPrismaQuery(parsedQuery) });

    return createOKResult(courses.map(normalizeCourse), headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
};
