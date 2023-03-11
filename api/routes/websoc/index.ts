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
import type { Term, WebsocAPIResponse } from "peterportal-api-next-types";
import { type WebsocAPIOptions, callWebSocAPI } from "websoc-api-next";
import type { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  normalizeQuery,
  sleep,
  sortResponse,
} from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  switch (method) {
    case "GET":
    case "HEAD":
      try {
        const parsedQuery = QuerySchema.parse(query);
        let ret: WebsocAPIResponse = { schools: [] };
        // Determine whether to enable caching for this request.
        if (
          !parsedQuery.cache ||
          parsedQuery.cache !== "false" ||
          !(await prisma.websocSection.count({
            where: {
              year: parsedQuery.year,
              quarter: parsedQuery.quarter,
            },
          }))
        ) {
          ret = combineResponses(
            ...(
              await prisma.websocSection.findMany({
                where: constructPrismaQuery(parsedQuery),
                select: {
                  data: true,
                },
                distinct: ["year", "quarter", "sectionCode"],
              })
            ).map((x) => x.data as WebsocAPIResponse),
            ret
          );
        } else {
          const term: Term = {
            year: parsedQuery.year,
            quarter: parsedQuery.quarter,
          };
          let queries: Array<WebsocAPIOptions | undefined> =
            normalizeQuery(parsedQuery);
          for (;;) {
            const res = await Promise.allSettled(
              queries.map((options) =>
                options
                  ? callWebSocAPI(term, options)
                  : new Promise<WebsocAPIResponse>(() => ({ schools: [] }))
              )
            );
            for (const [i, r] of Object.entries(res)) {
              if ("value" in r) {
                logger.info(
                  `WebSoc query for ${JSON.stringify(
                    queries[parseInt(i)]
                  )} succeeded`
                );
                queries[parseInt(i)] = undefined;
                ret = combineResponses(r.value, ret);
              } else {
                logger.info(
                  `WebSoc query for ${JSON.stringify(
                    queries[parseInt(i)]
                  )} failed`
                );
              }
            }
            queries = queries.filter((q) => q);
            if (!queries.length) break;
            await sleep(1000);
          }
        }
        // Sort the response and return it.
        return createOKResult(sortResponse(ret), requestId);
      } catch (e) {
        return createErrorResult(
          400,
          (e as ZodError).issues.map((i) => i.message).join("; "),
          requestId
        );
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
