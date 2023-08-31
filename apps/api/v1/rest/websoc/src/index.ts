import { PrismaClient } from "@libs/db";
import type { WebsocAPIResponse } from "@libs/websoc-api-next";
import { combineAndNormalizeResponses, notNull, sortResponse } from "@libs/websoc-utils";
import { createErrorResult, createOKResult, type InternalHandler } from "ant-stack";
import { ZodError } from "zod";

import { APILambdaClient } from "./APILambdaClient";
import { constructPrismaQuery, normalizeQuery } from "./lib";
import { QuerySchema } from "./schema";

const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];

let prisma: PrismaClient;
let lambdaClient: APILambdaClient;

export const GET: InternalHandler = async (request) => {
  const { headers, params, query, requestId } = request;

  prisma ??= new PrismaClient();
  lambdaClient ??= await APILambdaClient.new();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", headers, requestId);
    } catch (error) {
      createErrorResult(500, error, requestId);
    }
  }

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
          lambdaClient.getTerms({ function: "terms" }),
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

        webSocTerms.sort((a, b) => {
          if (a.shortName.substring(0, 4) > b.shortName.substring(0, 4)) return -1;
          if (a.shortName.substring(0, 4) < b.shortName.substring(0, 4)) return 1;
          return (
            quarterOrder.indexOf(b.shortName.substring(5)) -
            quarterOrder.indexOf(a.shortName.substring(5))
          );
        });

        return createOKResult(webSocTerms, headers, requestId);
      }

      case "depts": {
        const [gradesDepts, webSocDepts] = await Promise.all([
          prisma.gradesSection.findMany({
            distinct: ["department"],
            select: {
              department: true,
            },
          }),
          lambdaClient.getDepts({ function: "depts" }),
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

        return createOKResult(webSocDepts, headers, requestId);
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

          const combinedResponses = combineAndNormalizeResponses(...responses);

          return createOKResult(sortResponse(combinedResponses), headers, requestId);
        }

        const websocApiResponses = websocSections
          .map((x) => x.data)
          .filter(notNull) as WebsocAPIResponse[];

        const combinedResponses = combineAndNormalizeResponses(...websocApiResponses);

        return createOKResult(sortResponse(combinedResponses), headers, requestId);
      }

      /**
       * If this code is reached and the cacheOnly flag is set, return
       * an empty WebsocAPIResponse object. Otherwise, fall back to
       * querying WebSoc.
       */
      if (parsedQuery.cacheOnly) {
        return createOKResult({ schools: [] }, headers, requestId);
      }
    }

    const websocResults = await lambdaClient.getWebsoc({
      function: "websoc",
      parsedQuery,
      queries: normalizeQuery(parsedQuery),
    });

    return createOKResult(websocResults, headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
};
