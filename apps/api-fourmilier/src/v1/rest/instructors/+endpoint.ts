import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { ZodError } from "zod";

import { constructPrismaQuery } from "./lib";
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
    if (!Object.keys(parsedQuery).length)
      return createErrorResult(400, "Instructor UCInetID not provided", requestId);
    const instructors = await prisma.instructor.findMany({
      where: constructPrismaQuery(parsedQuery),
    });
    if (parsedQuery.taughtInTerms) {
      const terms = new Set(parsedQuery.taughtInTerms);
      return createOKResult(
        instructors.filter(
          (instructor) =>
            [...new Set(Object.values(instructor.courseHistory as Record<string, string[]>))]
              .flat()
              .filter((x) => terms.has(x)).length,
        ),
        headers,
        requestId,
      );
    }
    return createOKResult(instructors, headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
};
