import type { LambdaHandler, RawHandler } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import { PrismaClient } from "db";
import type { WebsocAPIResponse } from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";
import { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  normalizeQuery,
  notNull,
  sleep,
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

export const rawHandler: RawHandler = async (request) => {
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

          /**
           * WebSoc throws an error if a query returns more than 900 sections,
           * so we probably want to maintain this invariant as well.
           * (Also to prevent abuse of the endpoint.)
           */
          if (websocSections.length > 900) {
            return createErrorResult(
              400,
              "More than 900 sections matched your query. Please refine your search.",
              requestId
            );
          }

          if (websocSections.length) {
            const websocApiResponses = websocSections
              .map((x) => x.data)
              .filter(notNull) as WebsocAPIResponse[];
            const combinedResponses = combineResponses(...websocApiResponses);
            return createOKResult(sortResponse(combinedResponses), requestId);
          }
        }

        let queries = normalizeQuery(parsedQuery);
        let websocResponseData: WebsocAPIResponse = { schools: [] };
        let retries = 0;

        for (;;) {
          const responses = await Promise.allSettled(
            queries.map((options) => callWebSocAPI(parsedQuery, options))
          );

          const failed: WebsocAPIOptions[] = [];

          responses.forEach((response, i) => {
            const queryString = JSON.stringify(queries[i]);
            if (response.status === "fulfilled") {
              logger.info(`WebSoc query for ${queryString} succeeded`);
            } else {
              logger.info(`WebSoc query for ${queryString} failed`);
              failed.push(queries[i]);
            }
          });

          const successes = responses.filter(fulfilled);
          websocResponseData = successes.reduce(
            (acc, curr) => combineResponses(acc, curr.value),
            websocResponseData
          );

          queries = failed;
          if (!queries.length) break;
          // 3 attempts + (1 + 2 + 4) seconds ~= Lambda timeout (15 seconds)
          if (retries >= 2)
            return createErrorResult(
              500,
              "WebSoc failed to respond too many times. Please try again later.",
              requestId
            );
          await sleep(1000 * 2 ** retries++);
        }
        return createOKResult(sortResponse(websocResponseData), requestId);
      } catch (e) {
        if (e instanceof ZodError) {
          const messages = e.issues.map((issue) => issue.message);
          return createErrorResult(400, messages.join("; "), requestId);
        }
        return createErrorResult(400, e, requestId);
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler: LambdaHandler = async (event, context) =>
  createLambdaHandler(rawHandler)(event, context);
