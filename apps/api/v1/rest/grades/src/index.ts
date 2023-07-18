import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult, logger } from "ant-stack";
import type { InternalHandler } from "ant-stack";
import type { GradesOptions, GradesRaw } from "peterportal-api-next-types";
import { ZodError } from "zod";

import { aggregateGrades, constructPrismaQuery, lexOrd } from "./lib";
import { QuerySchema } from "./schema";

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { params, query, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }
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
            instructors: section.instructors.map((instructor) => instructor.name),
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
        const years = new Set<string>();
        const departments = new Set<string>();
        const courseNumbers = new Set<string>();
        const sectionCodes = new Set<string>();
        res.forEach(({ year, department, courseNumber, sectionCode }) => {
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
        return createOKResult<GradesOptions>(
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
          requestId,
        );
      }
    }
    return createErrorResult(400, `Invalid sub-resource ${params?.id}`, requestId);
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
          requestId,
        );
      }
      return createErrorResult(400, e.message, requestId);
    }
    return createErrorResult(400, e, requestId);
  }
};

export const HEAD = GET;
