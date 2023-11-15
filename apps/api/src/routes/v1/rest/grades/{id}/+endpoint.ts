import { PrismaClient } from "@libs/db";
import { logger, createHandler } from "@libs/lambda";
import type {
  AggregateGradesByCourse,
  AggregateGradesByOffering,
  GradesOptions,
  RawGrades,
} from "@peterportal-api/types";
import { ZodError } from "zod";

import {
  aggregateGrades,
  aggregateByOffering,
  constructPrismaQuery,
  lexOrd,
  transformRow,
  aggregateByCourse,
} from "./lib";
import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const { headers, pathParameters: params, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  try {
    const parsedQuery = QuerySchema.parse(query);
    switch (params?.id) {
      case "raw":
      case "aggregate":
        {
          const result = (
            await prisma.gradesSection.findMany({
              where: constructPrismaQuery(parsedQuery),
              include: { instructors: true },
            })
          ).map(transformRow);
          switch (params.id) {
            case "raw":
              return res.createOKResult<RawGrades>(result, headers, requestId);
            case "aggregate":
              return res.createOKResult(aggregateGrades(result), headers, requestId);
          }
        }
        break;
      case "options": {
        const result = await prisma.gradesSection.findMany({
          where: constructPrismaQuery(parsedQuery),
          select: {
            year: true,
            department: true,
            courseNumber: true,
            sectionCode: true,
          },
          distinct: ["year", "department", "courseNumber", "sectionCode"],
        });
        const years = new Set<string>();
        const departments = new Set<string>();
        const courseNumbers = new Set<string>();
        const sectionCodes = new Set<string>();
        result.forEach(({ year, department, courseNumber, sectionCode }) => {
          years.add(year);
          departments.add(department);
          courseNumbers.add(courseNumber);
          sectionCodes.add(sectionCode);
        });
        const ret = {
          years: Array.from(years).sort().reverse(),
          departments: Array.from(departments).sort(),
          courseNumbers: Array.from(courseNumbers).sort((a, b) => {
            const numOrd = parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10);
            return numOrd ? numOrd : lexOrd(a, b);
          }),
          sectionCodes: Array.from(sectionCodes).sort(),
        };
        return res.createOKResult<GradesOptions>(
          {
            ...ret,
            instructors: parsedQuery.instructor
              ? [parsedQuery.instructor]
              : (
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
          headers,
          requestId,
        );
      }
      case "aggregateByCourse": {
        return res.createOKResult<AggregateGradesByCourse>(
          aggregateByCourse(
            (
              await prisma.gradesSection.findMany({
                where: constructPrismaQuery(parsedQuery),
                include: { instructors: true },
              })
            ).map(transformRow),
          ),
          headers,
          requestId,
        );
      }
      case "aggregateByOffering": {
        return res.createOKResult<AggregateGradesByOffering>(
          aggregateByOffering(
            (
              await prisma.gradesSection.findMany({
                where: constructPrismaQuery(parsedQuery),
                include: { instructors: true },
              })
            ).map(transformRow),
          ),
          headers,
          requestId,
        );
      }
    }
    return res.createErrorResult(
      400,
      params?.id ? `Invalid operation ${params.id}` : "Operation name not provided",
      requestId,
    );
  } catch (e) {
    if (e instanceof ZodError) {
      const messages = e.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    if (e instanceof Error) {
      logger.error(e.message);
      // findMany failing due to too many placeholders
      if (e.message.includes("1390")) {
        return res.createErrorResult(
          400,
          "Your query returned too many entries. Please refine your search.",
          requestId,
        );
      }
      return res.createErrorResult(400, e.message, requestId);
    }
    return res.createErrorResult(400, e, requestId);
  }
}, onWarm);
