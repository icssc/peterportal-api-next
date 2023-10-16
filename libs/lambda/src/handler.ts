import type { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda";

import { warmingRequestBody } from "./request";
import { createOKResult, createErrorResult } from "./response";

export type ResponseHelpers = {
  ok: typeof createOKResult;
  error: typeof createErrorResult;
};

export type ExtendedApiGatewayHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  res: ResponseHelpers,
) => APIGatewayProxyResult | Promise<APIGatewayProxyResult>;

export function createHandler(handler: ExtendedApiGatewayHandler): ExtendedApiGatewayHandler {
  return async function (event, context) {
    const res: ResponseHelpers = {
      ok: (payload, headers, requestId) => createOKResult(payload, headers, requestId),
      error: (statusCode, e, requestId) => createErrorResult(statusCode, e, requestId),
    };

    if (event.body === JSON.stringify(warmingRequestBody)) {
      return res.ok("Successfully warmed!", event.headers, context.awsRequestId);
    }

    return handler(event, context, res);
  };
}
