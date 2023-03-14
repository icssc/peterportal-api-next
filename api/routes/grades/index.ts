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
import { PrismaClient } from "db";

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, params, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  const prisma = new PrismaClient();
  switch (method) {
    case "HEAD":
    case "GET":
      return createOKResult({}, requestId);
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
