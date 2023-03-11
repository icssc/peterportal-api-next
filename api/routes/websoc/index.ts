import type { LambdaHandler, RawHandler } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import { PrismaClient } from "db";
import type { WebsocAPIResponse } from "peterportal-api-next-types";
import { callWebSocAPI, WebsocAPIOptions } from "websoc-api-next";
import { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  normalizeQuery,
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
        if (!parsedQuery.cache || parsedQuery.cache !== "false") {
          const websocSections = await prisma.websocSection.findMany({
            where: constructPrismaQuery(parsedQuery),
            select: { data: true },
            distinct: ["year", "quarter", "sectionCode"],
          });

          // WebSoc throws an error if a query returns more than 900 sections,
          // so we probably want to maintain this invariant as well.
          // (Also to prevent abuse of the endpoint.)
          if (websocSections.length) {
            if (websocSections.length > 900) {
              return createErrorResult(
                400,
                "More than 900 sections matched your query. Please refine your search.",
                requestId
              );
            }
            const websocApiResponses = websocSections.map(
              (x) => x.data
            ) as WebsocAPIResponse[];
            const combinedResponses = combineResponses(...websocApiResponses);
            return createOKResult(sortResponse(combinedResponses), requestId);
          }
        }
        let queries: (WebsocAPIOptions | undefined)[] =
          normalizeQuery(parsedQuery);
        let response: WebsocAPIResponse = { schools: [] };
        let retries = 0;
        for (;;) {
          const responses = await Promise.allSettled(
            queries.map((options) =>
              options
                ? callWebSocAPI(parsedQuery, options)
                : new Promise<WebsocAPIResponse>(() => ({ schools: [] }))
            )
          );
          responses.forEach((response, i) => {
            const queryString = JSON.stringify(queries[i]);
            if (response.status === "fulfilled") {
              logger.info(`WebSoc query for ${queryString} succeeded`);
              queries[i] = undefined;
            } else {
              logger.info(`WebSoc query for ${queryString} failed`);
            }
          });
          response = combineResponses(
            response,
            ...responses.filter(fulfilled).map((s) => s.value)
          );
          queries = queries.filter((x) => x);
          if (!queries.length) break;
          await sleep(1000 * 2 ** retries++);
        }
        return createOKResult(sortResponse(response), requestId);
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
