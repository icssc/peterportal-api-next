import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import type { WebsocAPIResponse } from "@libs/uc-irvine-api/websoc";
import { combineAndNormalizeResponses, notNull, sortResponse } from "@libs/websoc-utils";
import { ZodError } from "zod";

import { APILambdaClient } from "./APILambdaClient";
import { constructPrismaQuery, normalizeQuery } from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

// let connected = false
const lambdaClient = await APILambdaClient.new();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;

  try {
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
        return res.createErrorResult(
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

          return res.createOKResult(sortResponse(combinedResponses), headers, requestId);
        }

        const websocApiResponses = websocSections
          .map((x) => x.data)
          .filter(notNull) as WebsocAPIResponse[];

        const combinedResponses = combineAndNormalizeResponses(...websocApiResponses);

        return res.createOKResult(sortResponse(combinedResponses), headers, requestId);
      }

      /**
       * If this code is reached and the cacheOnly flag is set, return
       * an empty WebsocAPIResponse object. Otherwise, fall back to
       * querying WebSoc.
       */
      if (parsedQuery.cacheOnly) {
        return res.createOKResult({ schools: [] }, headers, requestId);
      }
    }

    const websocResults = await lambdaClient.getWebsoc({
      function: "websoc",
      parsedQuery,
      queries: normalizeQuery(parsedQuery),
    });

    return res.createOKResult(websocResults, headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, error, requestId);
  }
}, onWarm);
