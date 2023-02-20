import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  IRequest,
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
  try {
    switch (method) {
      case "GET":
      case "HEAD":
        return createOKResult({}, requestId);
      default:
        return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
    }
  } catch (error: unknown) {
    return createErrorResult(500, error, requestId);
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
