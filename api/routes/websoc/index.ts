import { PrismaClient } from "@libs/db";
import type { WebsocAPIOptions } from "@libs/websoc-api-next";
import { callWebSocAPI } from "@libs/websoc-api-next";
import type { LambdaHandler, RawHandler } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import type { WebsocAPIResponse } from "peterportal-api-next-types";
import { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  fulfilled,
  normalizeQuery,
  notNull,
  sleep,
  sortResponse,
} from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const rawHandler: RawHandler = async (request) => {
  const { method, path, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  switch (method) {
    case "HEAD":
    case "GET":
      try {
        const parsedQuery = QuerySchema.parse(query);

        /**
         * Check whether an entry with the specified term exists in the sections table.
         * If not, then we're probably not scraping that term, so just proxy WebSoc.
         */
        const termExists = await prisma.websocSection.findFirst({
          where: { year: parsedQuery.year, quarter: parsedQuery.quarter },
        });

        if (parsedQuery.cache && termExists) {
          // The TTL for the scraper request.
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() + 1);

          /**
           * This needs to be wrapped in a try-catch since race conditions are possible.
           * In this case it's fine if the query doesn't execute,
           * because the entry will have already been created.
           */
          try {
            await prisma.websocTerm.upsert({
              where: {
                idx: { year: parsedQuery.year, quarter: parsedQuery.quarter },
              },
              create: {
                year: parsedQuery.year,
                quarter: parsedQuery.quarter,
                timestamp,
              },
              update: { timestamp },
            });
          } catch {
            // noop
          }

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

          /**
           * Return found sections if using cache and they exist in database.
           */
          if (websocSections.length) {
            const websocApiResponses = websocSections
              .map((x) => x.data)
              .filter(notNull) as WebsocAPIResponse[];
            const combinedResponses = combineResponses(...websocApiResponses);
            return createOKResult(sortResponse(combinedResponses), requestId);
          }
        }

        let queries = normalizeQuery(parsedQuery);
        let retries = 0;

        let responses: PromiseSettledResult<WebsocAPIResponse>[] = [];
        let queryString = "";

        let successes: PromiseFulfilledResult<WebsocAPIResponse>[] = [];
        const failed: WebsocAPIOptions[] = [];

        let websocResponseData: WebsocAPIResponse = { schools: [] };

        while (queries.length && retries < 3) {
          responses = await Promise.allSettled(
            queries.map((options) => callWebSocAPI(parsedQuery, options))
          );

          responses.forEach((response, i) => {
            queryString = JSON.stringify(queries[i]);
            if (response.status === "fulfilled") {
              logger.info(`WebSoc query for ${queryString} succeeded`);
            } else {
              logger.info(`WebSoc query for ${queryString} failed`);
              failed.push(queries[i]);
            }
          });

          successes = responses.filter(fulfilled);
          websocResponseData = successes.reduce(
            (acc, curr) => combineResponses(acc, curr.value),
            websocResponseData
          );

          queries = failed;
          if (queries.length) await sleep(1000 * 2 ** retries++);
        }

        // 3 attempts + (1 + 2 + 4) seconds ~= Lambda timeout (15 seconds)
        if (retries >= 2)
          return createErrorResult(
            500,
            "WebSoc failed to respond too many times. Please try again later.",
            requestId
          );

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
