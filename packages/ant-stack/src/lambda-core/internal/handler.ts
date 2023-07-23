import { brotliDecompressSync, gunzipSync, inflateSync } from "zlib";

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { RequestHandler } from "express";

import { logger } from "../logger";

import { type InternalRequest, transformExpressRequest, transformNodeRequest } from "./request";

/**
 * Mapping of decompression algorithms to their function calls.
 */
const decompressionAlgorithms: Record<string, (buf: Buffer) => Buffer> = {
  br: brotliDecompressSync,
  gzip: gunzipSync,
  deflate: inflateSync,
};

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
    logger.info(`Referer: ${request.headers?.referer}`);

    const result = await handler(request);

    const body = result.isBase64Encoded
      ? decompressionAlgorithms[result.headers?.["Content-Encoding"] as string](
          Buffer.from(result.body, "base64"),
        ).toString()
      : result.body;

    delete result.headers?.["Content-Encoding"];

    res.status(result.statusCode);
    res.set(result.headers);

    try {
      res.send(JSON.parse(body));
    } catch {
      res.send(body);
    }
  };

/**
 * Create an AWS Lambda node-runtime handler for a route from an {@link InternalHandler}.
 */
export const createNodeHandler =
  (handler: InternalHandler) => async (event: APIGatewayProxyEvent, context: Context) => {
    const request = transformNodeRequest(event, context);

    logger.info(`Path params: ${JSON.stringify(request.params)}`);
    logger.info(`Query: ${JSON.stringify(request.query)}`);
    logger.info(`Body: ${JSON.stringify(request.body)}`);
    logger.info(`Referer: ${request.headers?.referer}`);

    return handler(request);
  };
