import { LambdaClient } from "@aws-sdk/client-lambda";
import { PrismaClient } from "@libs/db";
import type { LambdaHandler, RawHandler } from "api-core";
import { createErrorResult, createLambdaHandler, createOKResult } from "api-core";
import type { Department, Response, TermData, WebsocAPIResponse } from "peterportal-api-next-types";
import { ZodError } from "zod";

import {
  combineResponses,
  constructPrismaQuery,
  invokeProxyService,
  normalizeQuery,
  notNull,
  sortResponse,
} from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();
const lambda = new LambdaClient({});

export const rawHandler: RawHandler = async (request) => {
  const { method, path, params, query, requestId } = request.getParams();
  if (request.isWarmerRequest()) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }
  switch (method) {
    case "HEAD":
    case "GET":
      try {
        switch (params?.id) {
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
              ((await invokeProxyService(lambda, { function: "terms" })) as Response<TermData[]>)
                .payload,
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
            const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];
            webSocTerms.sort((a, b) => {
              if (a.shortName.substring(0, 4) > b.shortName.substring(0, 4)) return -1;
              if (a.shortName.substring(0, 4) < b.shortName.substring(0, 4)) return 1;
              return (
                quarterOrder.indexOf(b.shortName.substring(5)) -
                quarterOrder.indexOf(a.shortName.substring(5))
              );
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
              ((await invokeProxyService(lambda, { function: "depts" })) as Response<Department[]>)
                .payload,
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

            webSocDepts.sort((a, b) => {
              if (a.deptValue == "ALL") return -1;
              if (b.deptValue == "ALL") return 1;
              if (a.deptValue > b.deptValue) return 1;
              if (a.deptValue < b.deptValue) return -1;
              return 0;
            });
            return createOKResult(webSocDepts, requestId);
          }
        }
        const parsedQuery = QuerySchema.parse(query);

        if (parsedQuery.cache) {
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
              requestId,
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
              const transactions = Object.entries(courses).map(([department, courseNumbers]) =>
                prisma.websocSection.findMany({
                  where: {
                    department,
                    courseNumber: { in: courseNumbers },
                  },
                  select: { data: true },
                  distinct: ["year", "quarter", "sectionCode"],
                }),
              );
              const responses = (await prisma.$transaction(transactions))
                .flat()
                .map((x) => x.data)
                .filter(notNull) as WebsocAPIResponse[];
              const combinedResponses = combineResponses(...responses);
              return createOKResult(sortResponse(combinedResponses), requestId);
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
          if (parsedQuery.cacheOnly) return createOKResult({ schools: [] }, requestId);
        }
        return createOKResult(
          (
            (await invokeProxyService(lambda, {
              function: "websoc",
              parsedQuery,
              queries: normalizeQuery(parsedQuery),
            })) as Response<WebsocAPIResponse>
          ).payload,
          requestId,
        );
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
