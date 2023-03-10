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
import { PrismaClient } from "db";
import hash from "object-hash";
import type {
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
} from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";
import type { ZodError } from "zod";

import { QuerySchema } from "./websoc.dto";

/**
 * Given a string of comma-separated values or an array of such strings,
 * return a sorted array containing all unique values.
 * @param val The value to normalize.
 */
const normalizeValue = (val: string | string[] | undefined): string[] =>
  Array.from(
    new Set(
      typeof val === "undefined"
        ? [""]
        : typeof val === "string"
        ? val.split(",")
        : val.map((x) => x.split(",")).flat()
    )
  ).sort();

/**
 * Given a nested section and all of its parent structures, returns a
 * ``WebsocAPIResponse`` object that contains only that section.
 * @param school The school that the department belongs to.
 * @param department The department that the course belongs to.
 * @param course The course that the section belongs to.
 * @param section The section to isolate.
 */
const isolateSection = (
  school: WebsocSchool,
  department: WebsocDepartment,
  course: WebsocCourse,
  section: WebsocSection
): WebsocAPIResponse => {
  const data = { schools: [{ ...school }] };
  data.schools[0].departments = [{ ...department }];
  data.schools[0].departments[0].courses = [{ ...course }];
  data.schools[0].departments[0].courses[0].sections = [{ ...section }];
  return data;
};

/**
 * Given a parsed query string, normalize the query and return it as an array of
 * objects that can be passed directly to ``callWebSocAPI``.
 *
 * For each valid key, an entry is created in the normalized query iff its value
 * is truthy and not equal to ``ANY``.
 *
 * Furthermore, to support batch queries for ``units`` and ``sectionCodes``,
 * additional copies of the normalized query are created for every ``units``
 * argument specified and for every 5 ``sectionCodes`` argument specified.
 * @param query The parsed query string to normalize.
 */
const normalizeQuery = (
  query: Record<string, string | string[] | undefined>
): WebsocAPIOptions[] => {
  const baseQuery: Record<string, string | string[] | unknown> = {};
  for (const key of [
    "ge",
    "department",
    "building",
    "room",
    "division",
    "instructorName",
    "courseTitle",
    "sectionType",
    "startTime",
    "endTime",
    "maxCapacity",
    "fullCourses",
    "cancelledCourses",
  ]) {
    if (query[key] && query[key] !== "ANY") {
      baseQuery[key] = query[key];
    }
  }
  for (const key of ["courseNumber", "days"]) {
    if (query[key] && query[key] !== "ANY") {
      baseQuery[key] = normalizeValue(query[key]).join(",");
    }
  }
  const sectionCodeArray = normalizeValue(query.sectionCodes);
  return normalizeValue(query.units)
    .map((units) => ({ ...baseQuery, units }))
    .map((q) =>
      Array.from(Array(Math.ceil(sectionCodeArray.length / 5)).keys()).map(
        (x) => ({
          ...q,
          sectionCodes: sectionCodeArray.slice(x * 5, (x + 1) * 5).join(","),
        })
      )
    )
    .flat()
    .map((q: Partial<WebsocAPIOptions>) => {
      if (!q.units) delete q["units"];
      if (!q.sectionCodes) delete q["sectionCodes"];
      return q as WebsocAPIOptions;
    });
};

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
const lexOrd = (a: string, b: string): number => (a === b ? 0 : a > b ? 1 : -1);

/**
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
const combineResponses = (
  ...responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  const sectionsHashSet: Record<string, WebsocAPIResponse> = {};
  for (const res of responses) {
    for (const school of res.schools) {
      for (const department of school.departments) {
        for (const course of department.courses) {
          for (const section of course.sections) {
            const s = isolateSection(school, department, course, section);
            sectionsHashSet[hash(s)] = s;
          }
        }
      }
    }
  }
  const sections = Object.values(sectionsHashSet);
  const combined = sections.shift();
  if (!combined) return { schools: [] };
  for (const section of sections) {
    if (
      combined.schools.findIndex(
        (s) => s.schoolName === section.schools[0].schoolName
      ) === -1
    ) {
      combined.schools.push(section.schools[0]);
      continue;
    }
    if (
      combined.schools.every(
        (s) =>
          s.departments.findIndex(
            (d) => d.deptCode === section.schools[0].departments[0].deptCode
          ) === -1
      )
    ) {
      combined.schools
        .find((s) => s.schoolName === section.schools[0].schoolName)
        ?.departments.push(section.schools[0].departments[0]);
      continue;
    }
    if (
      combined.schools.every((s) =>
        s.departments.every(
          (d) =>
            d.courses.findIndex(
              (c) =>
                c.courseNumber ===
                  section.schools[0].departments[0].courses[0].courseNumber &&
                c.courseTitle ===
                  section.schools[0].departments[0].courses[0].courseTitle
            ) === -1
        )
      )
    ) {
      combined.schools
        .find((s) => s.schoolName === section.schools[0].schoolName)
        ?.departments.find(
          (d) => d.deptCode === section.schools[0].departments[0].deptCode
        )
        ?.courses.push(section.schools[0].departments[0].courses[0]);
      continue;
    }
    if (
      combined.schools.every((s) =>
        s.departments.every((d) =>
          d.courses.every(
            (c) =>
              c.sections.findIndex(
                (e) =>
                  e.sectionCode ===
                  section.schools[0].departments[0].courses[0].sections[0]
                    .sectionCode
              ) === -1
          )
        )
      )
    ) {
      combined.schools
        .find((s) => s.schoolName === section.schools[0].schoolName)
        ?.departments.find(
          (d) => d.deptCode === section.schools[0].departments[0].deptCode
        )
        ?.courses.find(
          (c) =>
            c.courseNumber ===
              section.schools[0].departments[0].courses[0].courseNumber &&
            c.courseTitle ===
              section.schools[0].departments[0].courses[0].courseTitle
        )
        ?.sections.push(
          section.schools[0].departments[0].courses[0].sections[0]
        );
    }
  }
  return combined;
};

/**
 * Sleep for the given number of milliseconds.
 * @param ms How long to sleep for in ms.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deeply sorts the provided response and returns the sorted response.
 *
 * Schools are sorted in lexicographical order of their name, departments are
 * sorted in lexicographical order of their code, courses are sorted in
 * numerical order of their number (with lexicographical tiebreaks),
 * and sections are sorted in numerical order of their code.
 * @param res The response to sort.
 */
const sortResponse = (res: WebsocAPIResponse): WebsocAPIResponse => {
  res.schools.forEach((s) => {
    s.departments.forEach((d) => {
      d.courses.forEach((c) =>
        c.sections.sort(
          (a, b) => parseInt(a.sectionCode) - parseInt(b.sectionCode)
        )
      );
      d.courses.sort((a, b) => {
        const numOrd =
          parseInt(a.courseNumber.replace(/\D/g, "")) -
          parseInt(b.courseNumber.replace(/\D/g, ""));
        return numOrd ? numOrd : lexOrd(a.courseNumber, b.courseNumber);
      });
    });
    s.departments.sort((a, b) => lexOrd(a.deptCode, b.deptCode));
  });
  res.schools.sort((a, b) => lexOrd(a.schoolName, b.schoolName));
  return res;
};

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query: unparsedQuery, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(unparsedQuery)}`);
  switch (method) {
    case "GET":
    case "HEAD":
      try {
        const query = QuerySchema.parse(unparsedQuery);
        let ret: WebsocAPIResponse = { schools: [] };
        // Determine whether to enable caching for this request.
        if (!query.cache || query.cache !== "false") {
          const prisma = new PrismaClient();
          const orConditions = [
            ...(query.sectionCodes?.map((code) => ({
              sectionCode: code.includes("-")
                ? {
                    gte: parseInt(code.split("-")[0]),
                    lte: parseInt(code.split("-")[1]),
                  }
                : { equals: parseInt(code) },
            })) ?? []),
            ...(query.courseNumber
              ? query.courseNumber.includes(",")
                ? query.courseNumber.split(",").map((num) =>
                    num.includes("-")
                      ? {
                          courseNumeric: {
                            gte: parseInt(num.split("-")[0].replace(/\D/g, "")),
                            lte: parseInt(num.split("-")[1].replace(/\D/g, "")),
                          },
                        }
                      : {
                          courseNumber: num,
                        }
                  )
                : []
              : []),
            ...(query.units
              ? query.units.map((u) => ({
                  units:
                    u === "VAR"
                      ? {
                          contains: "-",
                        }
                      : {
                          startsWith: parseFloat(u).toString(),
                        },
                }))
              : []),
            ...["Su", "M", "Tu", "W", "Th", "F", "Sa"]
              .filter((x) => query.days?.includes(x))
              .map((x) => ({
                meetings: {
                  every: {
                    days: {
                      array_contains: x,
                    },
                  },
                },
              })),
          ];
          ret = combineResponses(
            ...(
              await prisma.websocSection.findMany({
                where: {
                  AND: [
                    {
                      year: query.year,
                      quarter: query.quarter,
                      ...(query.ge
                        ? {
                            geCategories: {
                              array_contains: query.ge,
                            },
                          }
                        : {}),
                      department: query?.department,
                      // TODO refactor zod schema because I forgot that course numbers could also be vectors
                      ...(query.courseNumber?.includes(",")
                        ? {}
                        : query.courseNumber?.includes("-")
                        ? {
                            courseNumeric: {
                              gte: parseInt(
                                query?.courseNumber
                                  .split("-")[0]
                                  .replace(/\D/g, "")
                              ),
                              lte: parseInt(
                                query?.courseNumber
                                  .split("-")[1]
                                  .replace(/\D/g, "")
                              ),
                            },
                          }
                        : {
                            courseNumber: query?.courseNumber,
                          }),
                      ...(query.instructorName
                        ? {
                            instructors: {
                              every: {
                                name: {
                                  contains: query.instructorName,
                                },
                              },
                            },
                          }
                        : {}),
                      ...(query.courseTitle
                        ? {
                            courseTitle: {
                              contains: query.courseTitle,
                            },
                          }
                        : {}),
                      sectionType:
                        query?.sectionType === "ANY"
                          ? undefined
                          : query.sectionType,
                      meetings: {
                        every: {
                          startTime: {
                            gte: (() => {
                              if (!query.startTime) return -9999;
                              const [hour, minute] = query.startTime.split(":");
                              return (
                                parseInt(hour) * 60 +
                                parseInt(minute) +
                                (minute.includes("pm") ? 720 : 0)
                              );
                            })(),
                          },
                          endTime: {
                            lte: (() => {
                              if (!query.endTime) return 9999;
                              const [hour, minute] = query.endTime.split(":");
                              return (
                                parseInt(hour) * 60 +
                                parseInt(minute) +
                                (minute.includes("pm") ? 720 : 0)
                              );
                            })(),
                          },
                        },
                      },
                    },
                    ...(query.division
                      ? [
                          query.division === "ANY"
                            ? {}
                            : query.division === "LowerDiv"
                            ? {
                                courseNumeric: {
                                  gte: 0,
                                  lte: 99,
                                },
                              }
                            : query.division === "UpperDiv"
                            ? {
                                courseNumeric: { gte: 100, lte: 199 },
                              }
                            : query.division === "Graduate"
                            ? {
                                courseNumeric: { gte: 200 },
                              }
                            : {},
                        ]
                      : []),
                  ],
                  ...(orConditions.length ? { OR: orConditions } : {}),
                },
                select: {
                  data: true,
                },
              })
            ).map((x) => x.data as WebsocAPIResponse),
            ret
          );
        } else {
          const term: Term = {
            year: query.year,
            quarter: query.quarter,
          };
          let queries: Array<WebsocAPIOptions | undefined> =
            normalizeQuery(query);
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
