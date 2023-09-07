import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";

import { normalizeCourse } from "../lib";

const prisma = new PrismaClient();

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

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

  if (params?.id == null) {
    return createErrorResult(400, "Course number not provided", requestId);
  }

  if (params?.id === "all") {
    const courses = await prisma.course.findMany();
    return createOKResult(courses.map(normalizeCourse), headers, requestId);
  }

  try {
    return createOKResult(
      normalizeCourse(
        await prisma.course.findFirstOrThrow({
          where: { id: decodeURIComponent(params.id) },
        }),
      ),
      headers,
      requestId,
    );
  } catch {
    return createErrorResult(404, `Course ${params.id} not found`, requestId);
  }
};
