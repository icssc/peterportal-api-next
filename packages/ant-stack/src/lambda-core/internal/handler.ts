import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { RequestHandler } from "express";

import { logger } from "../logger";

import { type InternalRequest, transformExpressRequest, transformNodeRequest } from "./request";

/**
 * A runtime-agnostic handler function.
 * Can be transformed into runtime specific handlers with the provided helper functions.
 */
export type InternalHandler = (request: InternalRequest) => Promise<APIGatewayProxyResult>;

/**
 * Create an Express handler for a route from an {@link InternalHandler}.
 * @remarks Used with the local Express development server.
 */
export const createExpressHandler =
  (handler: InternalHandler): RequestHandler =>
  async (req, res) => {
    const request = transformExpressRequest(req);

    logger.info(`Path params: ${JSON.stringify(request.params)}`);
    logger.info(`Query: ${JSON.stringify(request.query)}`);
    logger.info(`Body: ${JSON.stringify(request.body)}`);

    const result = await handler(request);

    res.status(result.statusCode);
    res.set(result.headers);

    try {
      res.send(JSON.parse(result.body));
    } catch {
      res.send(result.body);
    }
  };

/**
 * Create an AWS Lambda node-runtime handler for a route from an {@link InternalHandler}.
 */
export const createNodeHandler =
  (handler: InternalHandler) => async (event: APIGatewayProxyEvent, context: Context) => {
    const request = transformNodeRequest(event, context);

    logger.info(`Request: ${JSON.stringify(request.params)}`);

    return handler(request);
  };
