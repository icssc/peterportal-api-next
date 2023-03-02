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

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, requestId } = request.getParams();
  switch (method) {
    case "GET":
    case "HEAD":
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
