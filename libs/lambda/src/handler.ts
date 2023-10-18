import type { APIGatewayProxyEvent, Callback, Context, APIGatewayProxyResult } from "aws-lambda";

import { warmingRequestBody } from "./request";
import { createOKResult, createErrorResult } from "./response";

/**
 * `res` object like Express.js .
 */
export type ResponseHelpers = {
  /**
   * Create an OK response.
   */
  createOKResult: typeof createOKResult;

  /**
   * Create an error response.
   */
  createErrorResult: typeof createErrorResult;

  /**
   * Create an ok response and send it.
   */
  ok: <T>(
    payload: T,
    requestHeaders: Record<string, string | undefined>,
    requestId: string,
  ) => void;

  /**
   * Create an error response and send it.
   */
  error: (statusCode: number, e: unknown, requestId: string) => void;
};

export type ExtendedApiGatewayHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  res: ResponseHelpers,
) => void | APIGatewayProxyResult | Promise<APIGatewayProxyResult | void>;

/**
 * Override the type from aws-lambda because it's bad.
 */
export type APIGatewayProxyHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>,
) => void | Promise<APIGatewayProxyResult | void>;

/**
 * Creates a handler for API Gateway.
 *
 * Handles warming requests and provides utilities for formatting responses.
 */
export function createHandler(handler: ExtendedApiGatewayHandler): APIGatewayProxyHandler {
  return async function (event, context, callback) {
    if (event.body === JSON.stringify(warmingRequestBody)) {
      return createOKResult("Successfully warmed!", event.headers, context.awsRequestId);
    }

    const res: ResponseHelpers = {
      ok: (payload, headers, requestId) => {
        callback(undefined, createOKResult(payload, headers, requestId));
      },
      error: (statusCode, e, requestId) => {
        callback(undefined, createErrorResult(statusCode, e, requestId));
      },
      createOKResult,
      createErrorResult,
    };

    return handler(event, context, res);
  };
}
