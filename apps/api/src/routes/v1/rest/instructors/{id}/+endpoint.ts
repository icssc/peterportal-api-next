import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";

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
    return createErrorResult(400, "Instructor UCInetID not provided", requestId);
  }

  try {
    if (params.id === "all") {
      const instructors = await prisma.instructor.findMany();
      return createOKResult(instructors, headers, requestId);
    }

    return createOKResult(
      await prisma.instructor.findFirstOrThrow({
        where: { ucinetid: decodeURIComponent(params.id) },
      }),
      headers,
      requestId,
    );
  } catch {
    return createErrorResult(404, `Instructor ${params.id} not found`, requestId);
  }
};
