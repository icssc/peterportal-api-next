import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult, logger } from "ant-stack";
import type { InternalHandler } from "ant-stack";
import type {
  GradeDistribution,
  GradeSection,
  GradesOptions,
  GradesRaw,
  Quarter,
} from "peterportal-api-next-types";
import { ZodError } from "zod";

import { aggregateGrades, constructPrismaQuery, lexOrd } from "./lib";
import { QuerySchema } from "./schema";

/**
 * The maximum number of grades records
 * that can be returned for each `findMany` call.
 * This number is the quotient of the maximum number of placeholders in prepared
 * statements supported by MariaDB (2**16 - 1), and the number of placeholders
 * needed for every grades record (3).
 */
const MAX_RECORDS_PER_QUERY = 21845;

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { headers, params, query, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", headers, requestId);
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
          const where = constructPrismaQuery(parsedQuery);
          const count = (await prisma.gradesSection.findMany({ where })).length;
          const res: Array<
            Omit<GradeSection & GradeDistribution, "instructors"> & {
              instructors: { year: string; quarter: Quarter; sectionCode: string; name: string }[];
            }
          > = [];
          res.push(
            ...(await prisma.gradesSection.findMany({
              take: MAX_RECORDS_PER_QUERY,
              where,
              include: { instructors: true },
            })),
          );
          if (count > MAX_RECORDS_PER_QUERY) {
            for (let _ = MAX_RECORDS_PER_QUERY; _ < count; _ += MAX_RECORDS_PER_QUERY) {
              const { year, quarter, sectionCode } = res.slice(-1)[0];
              res.push(
                ...(await prisma.gradesSection.findMany({
                  skip: 1,
                  take: MAX_RECORDS_PER_QUERY,
                  cursor: { idx: { year, quarter, sectionCode } },
                  where,
                  include: { instructors: true },
                })),
              );
            }
          }
          const withInstructors = res.map((section) => ({
            ...section,
            instructors: section.instructors.map((instructor) => instructor.name),
          }));
          switch (params.id) {
            case "raw":
              return createOKResult<GradesRaw>(withInstructors, headers, requestId);
            case "aggregate":
              return createOKResult(aggregateGrades(withInstructors), headers, requestId);
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
          headers,
          requestId,
        );
      }
    }
    return createErrorResult(
      400,
      params?.id ? `Invalid operation ${params.id}` : "Operation name not provided",
      requestId,
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
          requestId,
        );
      }
      return createErrorResult(400, e.message, requestId);
    }
    return createErrorResult(400, e, requestId);
  }
};
