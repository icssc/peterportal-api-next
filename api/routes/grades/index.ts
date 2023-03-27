import { PrismaClient } from "@libs/db";
import type { IRequest } from "api-core";
import {
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
import type { GradesOptions, GradesRaw } from "peterportal-api-next-types";
import { ZodError } from "zod";

import { aggregateGrades, constructPrismaQuery, lexOrd } from "./lib";
import { QuerySchema } from "./schema";

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, params, query, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(query)}`);
  const prisma = new PrismaClient();
  switch (method) {
    case "HEAD":
    case "GET":
      try {
        const parsedQuery = QuerySchema.parse(query);
        switch (params?.id) {
          case "raw":
          case "aggregate":
            {
              const res = (
                await prisma.gradesSection.findMany({
                  where: constructPrismaQuery(parsedQuery),
                  include: { instructors: true },
                })
              ).map((section) => ({
                ...section,
                instructors: section.instructors.map(
                  (instructor) => instructor.name
                ),
              }));
              switch (params.id) {
                case "raw":
                  return createOKResult<GradesRaw>(res, requestId);
                case "aggregate":
                  return createOKResult(aggregateGrades(res), requestId);
              }
            }
            break;
          case "options": {
            const res = await prisma.gradesSection.findMany({
              where: constructPrismaQuery(parsedQuery),
              select: {
                year: true,
                department: true,
                courseNumber: true,
                sectionCode: true,
              },
              distinct: ["year", "department", "courseNumber", "sectionCode"],
            });
            const years: Set<string> = new Set();
            const departments: Set<string> = new Set();
            const courseNumbers: Set<string> = new Set();
            const sectionCodes: Set<string> = new Set();
            res.forEach(({ year, department, courseNumber, sectionCode }) => {
              years.add(year);
              departments.add(department);
              courseNumbers.add(courseNumber);
              sectionCodes.add(sectionCode);
            });
            const ret: Omit<GradesOptions, "instructors"> = {
              years: Array.from(years).sort().reverse(),
              departments: Array.from(departments).sort(),
              courseNumbers: Array.from(courseNumbers).sort((a, b) => {
                const numOrd =
                  parseInt(a.replace(/\D/g, ""), 10) -
                  parseInt(b.replace(/\D/g, ""), 10);
                return numOrd ? numOrd : lexOrd(a, b);
              }),
              sectionCodes: Array.from(sectionCodes).sort(),
            };
            return createOKResult<GradesOptions>(
              {
                ...ret,
                instructors: (
                  await prisma.gradesInstructor.findMany({
                    where: {
                      year: { in: ret.years },
                      sectionCode: { in: ret.sectionCodes },
                    },
                    select: { name: true },
                    distinct: ["name"],
                  })
                )
                  .map((x) => x.name)
                  .sort(),
              },
              requestId
            );
          }
        }
        return createErrorResult(
          400,
          `Invalid sub-resource ${params?.id}`,
          requestId
        );
      } catch (e) {
        if (e instanceof ZodError) {
          const messages = e.issues.map((issue) => issue.message);
          return createErrorResult(400, messages.join("; "), requestId);
        }
        if (e instanceof Error) {
          logger.error(e.message);
          // findMany failing due to too many placeholders
          if (e.message.includes("1390")) {
            return createErrorResult(
              400,
              "Your query returned too many entries. Please refine your search.",
              requestId
            );
          }
          return createErrorResult(400, e.message, requestId);
        }
        return createErrorResult(400, e, requestId);
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
