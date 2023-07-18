import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { RequestHandler } from "express";

import { logger } from "../logger.js";

import {
  type BunRequest,
  type InternalRequest,
  normalizeRecord,
  transformBunRequest,
  transformExpressRequest,
  transformNodeRequest,
} from "./request.js";

/**
 * A runtime-agnostic handler function.
 * Can be transformed into runtime specific handlers with the provided helper functions.
 */
export type InternalHandler = (request: InternalRequest) => Promise<APIGatewayProxyResult>;

/**
 * Create an Express handler for a route from an {@link InternalHandler}.
 * @remarks Used with the local Express development server.
 */
export function createExpressHandler(handler: InternalHandler): RequestHandler {
  const expressHandler: RequestHandler = async (req, res) => {
    const request = transformExpressRequest(req);

    logger.info(`Path params: ${JSON.stringify(request.params)}`);
    logger.info(`Query: ${JSON.stringify(request.query)}`);

    const result = await handler(request);

    res.status(result.statusCode);
    res.set(result.headers);

    try {
      res.send(JSON.parse(result.body));
    } catch {
      res.send(result.body);
    }
  };

  return expressHandler;
}

/**
 * Create an AWS Lambda node-runtime handler for a route from an {@link InternalHandler}.
 */
export function createNodeHandler(handler: InternalHandler) {
  const nodeHandler = async (event: APIGatewayProxyEvent, context: Context) => {
    const request = transformNodeRequest(event, context);

    logger.info(`Request: ${JSON.stringify(request.params)}`);

    return handler(request);
  };

  return nodeHandler;
}

/**
 * Create an AWS Lambnda Bun-runtime (HTTP) handler for a route from an {@link InternalHandler}.
 */
export function createBunHandler(handler: InternalHandler) {
  const lambdaHandler = async (event: BunRequest) => {
    const request = transformBunRequest(event);

    logger.info(`Request: ${JSON.stringify(request.params)}`);

    const response = await handler(request);

    const status = response.statusCode;

    const headers = normalizeRecord(response.headers);

    return new Response(response.body, { status, headers });
  };

  return lambdaHandler;
}
