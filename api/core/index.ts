import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Request, RequestHandler } from "express";
import { ErrorResponse, Response } from "peterportal-api-next-types";

// You should not need to touch anything else in this file,
// unless you know what you are doing.

/* region Global stuff */

// Add `JSON.stringify()` support to `BigInt` since Prisma uses it.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function () {
  return this.toString();
};

/* endregion */

/* region Exported constants */

// UUID with all zeros, to populate the `requestId` field when testing locally.
export const zeroUUID = "00000000-0000-0000-0000-000000000000" as const;

// Mapping of HTTP/1.1 error status codes to their RFC 2616 names.
export const httpErrorCodes = {
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error",
} as const;

// Mapping of Date month numbers to three-char month abbreviations (for CLF date).
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/* endregion */

/* region Exported types */

/**
 * The base class for request data passed to a `RawHandler`.
 */
export interface IRequest {
  /**
   * @return Relevant request data from the parameters passed in the constructor.
   */
  getParams(): HandlerParams;
}

/* endregion */

/* region Internal types */

/**
 * Request data populated by an Express integration.
 */
class ExpressRequest implements IRequest {
  constructor(private readonly req: Request) {}
  getParams() {
    const { body, method, params, path, query } = this.req;
    return {
      body,
      method,
      params,
      path,
      query: query as Record<string, string | string[] | undefined>,
      requestId: zeroUUID,
    } as HandlerParams;
  }
}

/**
 * Request data populated by a Lambda integration.
 */
class LambdaRequest implements IRequest {
  constructor(
    private readonly event: APIGatewayProxyEvent,
    private readonly context: Context
  ) {}
  getParams() {
    const {
      body,
      httpMethod: method,
      multiValueQueryStringParameters: mqs,
      pathParameters: params,
      path,
      queryStringParameters: qs,
    } = this.event;
    return {
      body: JSON.parse(body ?? "{}"),
      method,
      params,
      path,
      query: { ...qs, ...mqs },
      requestId: this.context.awsRequestId,
    } as HandlerParams;
  }
}

/**
 * The signature that all `rawHandler`s exported from `some-route` should have.
 */
type RawHandler = (request: IRequest) => Promise<APIGatewayProxyResult>;

/**
 * The signature that an Express handler should have.
 * This is just a type alias for Express's `RequestHandler`.
 */
type ExpressHandler = RequestHandler;

/**
 * The signature that an `async/await`-based Lambda proxy handler should have.
 */
type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

/**
 * Parameters used by a `RawHandler`, which can be extracted from an `IRequest`
 * object using `getParams`.
 */
interface HandlerParams {
  /**
   * The body of the request.
   */
  body: Record<string, string>;
  /**
   * The method of the request.
   */
  method: string;
  /**
   * Path parameter(s) passed in the request, if any.
   */
  params: Record<string, string | undefined> | null;
  /**
   * The absolute path of the request.
   */
  path: string;
  /**
   * The parsed query string passed in the request.
   */
  query: Record<string, string | string[] | undefined>;
  /**
   * The request ID associated with the request.
   */
  requestId: string;
}

/* endregion */

/* region Exported helper functions */

/**
 * Helper function for creating the result associated with a 200 OK response.
 * @param payload The payload to send in the response.
 * @param requestId The request ID associated with the request.
 */
export const createOKResult = <T>(
  payload: T,
  requestId: string
): APIGatewayProxyResult => {
  const body: Response<T> = {
    timestamp: toCLFString(new Date()),
    requestId,
    statusCode: 200,
    payload,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  };
};

/**
 * Helper function for creating the result associated with an erroneous response.
 * @param statusCode The status code to send in the response.
 * @param error The error to send in the response. Note that this is of type ``unknown`` because caught ``Error``s in TypeScript are always typed as ``unknown``.
 * @param requestId The request ID associated with the request.
 */
export const createErrorResult = (
  statusCode: number,
  error: unknown,
  requestId: string
): APIGatewayProxyResult => {
  const body: ErrorResponse = {
    timestamp: toCLFString(new Date()),
    requestId,
    statusCode,
    error: httpErrorCodes[statusCode as keyof typeof httpErrorCodes],
    message:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === "string"
        ? error
        : "An unknown error has occurred. Please try again.",
  };
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  };
};

/**
 * Helper function for creating an Express handler for a route.
 * This is used to interface with the local Express development server.
 * @param handler The ``RawHandler`` object from which to create an Express handler.
 */
export const createExpressHandler =
  (handler: RawHandler): ExpressHandler =>
  async (req, res): Promise<void> => {
    const result = await handler(new ExpressRequest(req));
    res.status(result.statusCode);
    res.set(result.headers);
    res.send(JSON.parse(result.body));
  };

/**
 * Helper function for creating an AWS Lambda handler for a route.
 * This is used to interface with the AWS API Gateway in production.
 * @param handler The ``RawHandler`` object from which to create a Lambda handler.
 */
export const createLambdaHandler =
  (handler: RawHandler): LambdaHandler =>
  async (
    event: APIGatewayProxyEvent,
    context: Context
  ): Promise<APIGatewayProxyResult> => {
    return handler(new LambdaRequest(event, context));
  };

/**
 * Helper function for converting a ``Date`` object to a CLF date string,
 * e.g. `11/Dec/2022:03:48:12 +0000`.
 *
 * This only exists because API Gateway's gateway responses can only return the
 * timestamp in this format, and not ISO 8601.
 * @param date The ``Date`` object to convert.
 */
export const toCLFString = (date: Date): string =>
  `${date.getUTCDate().toString().padStart(2, "0")}/${
    months[date.getUTCMonth()]
  }/${date.getUTCFullYear()}:${date
    .getUTCHours()
    .toString()
    .padStart(2, "0")}:${date
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}:${date
    .getUTCSeconds()
    .toString()
    .padStart(2, "0")} +0000`;

/* endregion */