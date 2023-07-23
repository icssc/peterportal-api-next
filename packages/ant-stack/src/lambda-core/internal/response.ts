import { brotliCompressSync, deflateSync, gzipSync } from "zlib";

import type { APIGatewayProxyResult } from "aws-lambda";
import type { ErrorResponse, Response } from "peterportal-api-next-types";

import { httpErrorCodes, months } from "../constants";
import { logger } from "../logger";

/**
 * The payload size above which we want to start compressing the response.
 * Default: 128 KiB
 */
const MIN_COMPRESSION_SIZE = 128 * 1024;

/**
 * Common response headers.
 */
const responseHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "Apollo-Require-Preflight, Content-Type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Mapping of compression algorithms to their function calls.
 */
const compressionAlgorithms: Record<string, (buf: string) => Buffer> = {
  br: brotliCompressSync,
  gzip: gzipSync,
  deflate: deflateSync,
};

/**
 * Helper function for converting a ``Date`` object to a CLF date string.
 * @example `11/Dec/2022:03:48:12 +0000`
 *
 * This only exists because API Gateway's gateway responses can only return the
 * timestamp in this format, and not ISO 8601.
 *
 * @param date The ``Date`` object to convert.
 */
export function createTimestamp(date: Date = new Date()): string {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day}/${month}/${year}:${hours}:${minutes}:${seconds} +0000`;
}

/**
 * Log and create a "200 OK" response.
 * @param payload The payload to send in the response.
 * @param requestHeaders
 * @param requestId The request ID associated with the request.
 */
export function createOKResult<T>(
  payload: T,
  requestHeaders: Record<string, string>,
  requestId: string,
): APIGatewayProxyResult {
  const statusCode = 200;
  const timestamp = createTimestamp();
  const response: Response<T> = { statusCode, timestamp, requestId, payload };
  const headers = { ...responseHeaders };
  let body = JSON.stringify(response);
  if (!requestHeaders["x-no-compression"] && body.length > MIN_COMPRESSION_SIZE) {
    try {
      // Prioritize Brotli if supported by the client, then gzip, then DEFLATE.
      for (const [name, func] of Object.entries(compressionAlgorithms)) {
        if (requestHeaders["accept-encoding"].includes(name)) {
          body = func(body).toString("base64");
          headers["Content-Encoding"] = name;
          break;
        }
      }
    } catch (e) {
      return createErrorResult(500, e, requestId);
    }
  }
  logger.info("200 OK");
  return {
    statusCode,
    isBase64Encoded: !requestHeaders["x-no-compression"] && !!headers["Content-Encoding"],
    body,
    headers,
  };
}

/**
 * Log and create an error response.
 *
 * @param statusCode The status code to send in the response.
 * @param e The error to send in the response.
 *
 * @param requestId The request ID associated with the request.
 */
export function createErrorResult(
  statusCode: number,
  e: unknown,
  requestId: string,
): APIGatewayProxyResult {
  const timestamp = createTimestamp();

  const message =
    e instanceof Error
      ? `${e.name}: ${e.message}`
      : typeof e === "string"
      ? e
      : "An unknown error has occurred. Please try again.";

  const error = httpErrorCodes[statusCode as keyof typeof httpErrorCodes];

  const body: ErrorResponse = { timestamp, requestId, statusCode, error, message };

  logger.error(`${body.statusCode} ${body.error}: ${body.message}`);

  return { statusCode, body: JSON.stringify(body), headers: responseHeaders };
}
