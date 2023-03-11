import {
  type IRequest,
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
import type { WebsocAPIResponse } from "peterportal-api-next-types";
import { callWebSocAPI } from "websoc-api-next";
import { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  normalizeQuery,
  notNull,
  sortResponse,
} from "./lib";
import { QuerySchema } from "./schema";

/**
 * type guard that asserts that the settled promise was fulfilled
 */
const fulfilled = <T>(
  value: PromiseSettledResult<T>
): value is PromiseFulfilledResult<T> => value.status === "fulfilled";

const prisma = new PrismaClient();

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  switch (method) {
    case "HEAD":
      try {
        const parsedQuery = QuerySchema.parse(query);
        if (!parsedQuery.cache) {
          const websocSections = await prisma.websocSection.findMany({
            where: constructPrismaQuery(parsedQuery),
            select: { data: true },
            distinct: ["year", "quarter", "sectionCode"],
          });

          if (websocSections.length) {
            const websocApiResponses = websocSections
              .map((x) => x.data)
              .filter(notNull) as WebsocAPIResponse[];
            const combinedRespones = combineResponses(...websocApiResponses);
            return createOKResult(sortResponse(combinedRespones), requestId);
          }
        }

        const queries = normalizeQuery(parsedQuery);
        const responses = await Promise.allSettled(
          queries.map((options) => callWebSocAPI(parsedQuery, options))
        );
        responses.forEach((response, i) => {
          const queryString = JSON.stringify(queries[i]);
          if (response.status === "fulfilled") {
            logger.info(`WebSoc query for ${queryString} succeeded`);
          } else {
            logger.info(`WebSoc query for ${queryString} failed`);
          }
        });

        const successes = responses.filter(fulfilled);
        const websocResponseData = successes.reduce(
          (acc, curr) => combineResponses(acc, curr.value),
          { schools: [] } as WebsocAPIResponse
        );
        return createOKResult(sortResponse(websocResponseData), requestId);
      } catch (e) {
        if (e instanceof ZodError) {
          const messages = e.issues.map((issue) => issue.message);
          return createErrorResult(400, messages, requestId);
        }
        return createErrorResult(400, e, requestId);
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

export const lambdaHandler: LambdaHandler = async (event, context) =>
  createLambdaHandler(rawHandler)(event, context);
