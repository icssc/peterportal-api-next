import type { IRequest } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { PrismaClient } from "db";

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, requestId } = request.getParams();
  const prisma = new PrismaClient();
  switch (method) {
    case "GET":
    case "HEAD":
      return createOKResult(logger, {}, requestId);
    default:
      return createErrorResult(
        logger,
        400,
        `Cannot ${method} ${path}`,
        requestId
      );
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
