import { PrismaClient } from "@libs/db";
import type { WebsocAPIOptions } from "@libs/websoc-api-next";
import { callWebSocAPI, getDepts, getTerms } from "@libs/websoc-api-next";
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
  const { method, path, params, query, requestId } = request.getParams();
  switch (method) {
    case "HEAD":
    case "GET":
      try {
        switch (params?.option) {
          case "terms": {
            const [gradesTerms, webSocTerms] = await Promise.all([
              prisma.gradesSection.findMany({
                distinct: ["year", "quarter"],
                select: {
                  year: true,
                  quarter: true,
                },
                orderBy: [{ year: "desc" }, { quarter: "desc" }],
              }),
              getTerms(),
            ]);
            const shortNames = webSocTerms.map((x) => x.shortName);
            gradesTerms.forEach(({ year, quarter }) => {
              if (!shortNames.includes(`${year} ${quarter}`)) {
                let longName = year;
                switch (quarter) {
                  case "Summer1":
                    longName += " Summer Session 1";
                    break;
                  case "Summer2":
                    longName += " Summer Session 2";
                    break;
                  case "Summer10wk":
                    longName += " 10-wk Summer";
                    break;
                  default:
                    longName += ` ${quarter} Quarter`;
                    break;
                }
                webSocTerms.push({
                  shortName: `${year} ${quarter}`,
                  longName: longName,
                });
              }
            });
            return createOKResult(webSocTerms, requestId);
          }

          case "depts": {
            const [gradesDepts, webSocDepts] = await Promise.all([
              prisma.gradesSection.findMany({
                distinct: ["department"],
                select: {
                  department: true,
                },
              }),
              getDepts(),
            ]);

            const deptValues = webSocDepts.map((x) => x.deptValue);
            gradesDepts.forEach((element) => {
              if (!deptValues.includes(element.department)) {
                webSocDepts.push({
                  deptLabel: element.department,
                  deptValue: element.department,
                });
              }
            });

            return createOKResult(webSocDepts, requestId);
          }
        }
        const parsedQuery = QuerySchema.parse(query);

        if (parsedQuery.cache) {
          /**
           * Check whether an entry with the specified term exists in the sections table.
           * If not, then we're probably not scraping that term, so just proxy WebSoc.
           */
          const termExists = await prisma.websocSection.findFirst({
            where: { year: parsedQuery.year, quarter: parsedQuery.quarter },
          });
          if (termExists || parsedQuery.cacheOnly) {
            const websocSections = await prisma.websocSection.findMany({
              where: constructPrismaQuery(parsedQuery),
              select: { department: true, courseNumber: true, data: true },
              distinct: ["year", "quarter", "sectionCode"],
            });

            /**
             * WebSoc throws an error if a query returns more than 900 sections,
             * so we want to maintain this invariant as well, but only if
             * cacheOnly is set to false.
             */
            if (websocSections.length > 900 && !parsedQuery.cacheOnly) {
              return createErrorResult(
                400,
                "More than 900 sections matched your query. Please refine your search.",
                requestId
              );
            }

            /**
             * Return found sections if we're using the cache and if they exist
             * in the database.
             */
            if (websocSections.length) {
              /**
               * If the includeCoCourses flag is set, get a mapping of all
               * departments to the included course numbers, and return all
               * sections that match from the database.
               */
              if (parsedQuery.includeCoCourses) {
                const courses: Record<string, string[]> = {};
                websocSections.forEach(({ department, courseNumber }) => {
                  courses[department]
                    ? courses[department].push(courseNumber)
                    : (courses[department] = [courseNumber]);
                });
                const transactions = Object.entries(courses).map(
                  ([department, courseNumbers]) =>
                    prisma.websocSection.findMany({
                      where: {
                        department,
                        courseNumber: { in: courseNumbers },
                      },
                      select: { data: true },
                      distinct: ["year", "quarter", "sectionCode"],
                    })
                );
                const responses = (await prisma.$transaction(transactions))
                  .flat()
                  .map((x) => x.data)
                  .filter(notNull) as WebsocAPIResponse[];
                const combinedResponses = combineResponses(...responses);
                return createOKResult(
                  sortResponse(combinedResponses),
                  requestId
                );
              }
              const websocApiResponses = websocSections
                .map((x) => x.data)
                .filter(notNull) as WebsocAPIResponse[];
              const combinedResponses = combineResponses(...websocApiResponses);
              return createOKResult(sortResponse(combinedResponses), requestId);
            }
            /**
             * If this code is reached and the cacheOnly flag is set, return
             * an empty WebsocAPIResponse object. Otherwise, fall back to
             * querying WebSoc.
             */
            if (parsedQuery.cacheOnly)
              return createOKResult({ schools: [] }, requestId);
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
