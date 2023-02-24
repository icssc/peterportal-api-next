import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import type { IRequest } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
} from "api-core";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import type { SortKey } from "ddb";
import { DDBDocClient } from "ddb";
import hash from "object-hash";
import type {
  Quarter,
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";
import {
  cancelledCoursesOptions,
  divisions,
  fullCoursesOptions,
  quarters,
  sectionTypes,
} from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";

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
 * Checks whether the given optional parameter is valid.
 * @param query The parsed query string.
 * @param param The parameter of the query string to validate.
 * @param validParams The set of all valid values for ``query[param]``.
 */
const isValidOptionalParameter = (
  query: Record<string, string | string[] | undefined>,
  param: string,
  validParams: unknown[]
): boolean =>
  !(
    query[param] &&
    (typeof query[param] !== "string" ||
      (!validParams.includes(query[param]) && query[param] !== "ANY"))
  );

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
  combined.schools.forEach((s) => {
    s.departments.forEach((d) => {
      d.courses.forEach((c) => {
        c.sections.forEach((e) => {
          const meetingsHashSet: Record<string, WebsocSectionMeeting> = {};
          for (const meeting of e.meetings) {
            const meetingHash = hash([meeting.days, meeting.time]);
            if (meetingHash in meetingsHashSet) {
              meetingsHashSet[meetingHash].bldg.push(meeting.bldg[0]);
            } else {
              meetingsHashSet[meetingHash] = { ...meeting };
            }
            e.meetings = Object.values(meetingsHashSet);
          }
        });
      });
    });
  });
  return combined;
};

/**
 * Dispatches the cache updater lambda.
 * @param lambdaClient The Lambda Client to use for this operation.
 * @param tableName The name of the table in which to store the result.
 * @param term The term to cache.
 * @param query The query to cache.
 */
const dispatchCacheUpdater = async (
  lambdaClient: LambdaClient,
  tableName: string,
  term: Term,
  query: WebsocAPIOptions
): Promise<void> => {
  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: "peterportal-api-next-websoc-cache-updater",
      InvocationType: InvocationType.Event,
      Payload: JSON.stringify({
        tableName,
        term,
        query,
      }) as unknown as Uint8Array,
    })
  );
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

/**
 * Determines whether a specified query is eligible to query the cache twice, if
 * the first query resulted in a cache miss. This is only possible iff the query
 * is of the form of one of the following:
 * - The query has a `department` and a scalar value for `courseNumber`.
 * - The query has a vector value for `sectionCodes`.
 * @param query The query for which to check eligibility.
 */
const isTwiceCacheable = (query: WebsocAPIOptions): boolean =>
  Object.keys(query).every(
    (x) =>
      ![
        "ge",
        "instructorName",
        "building",
        "room",
        "division",
        "courseTitle",
        "sectionType",
        "units",
        "days",
        "startTime",
        "endTime",
        "maxCapacity",
        "fullCourses",
        "cancelledCourses",
      ].includes(x)
  ) &&
  Object.keys(query).filter((x) => ["department", "sectionCodes"].includes(x))
    .length === 1 &&
  !!(
    (query.department &&
      !query.courseNumber?.includes("-") &&
      !query.courseNumber?.includes(",")) ||
    query.sectionCodes?.includes(",")
  );

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  switch (method) {
    case "GET":
    case "HEAD":
      try {
        // Validate the required parameters.
        for (const param of ["year", "quarter"]) {
          if (!query[param]) {
            return createErrorResult(
              400,
              `Parameter ${param} not provided`,
              requestId
            );
          }
        }
        if (
          !(
            query.ge ||
            query.department ||
            query.sectionCodes ||
            query.instructorName
          )
        ) {
          return createErrorResult(
            400,
            "You must provide at least one of ge, department, sectionCode, and instructorName",
            requestId
          );
        }
        if (
          typeof query.year !== "string" ||
          query.year.length !== 4 ||
          isNaN(parseInt(query.year)) ||
          parseInt(query.year).toString().length !== 4
        ) {
          return createErrorResult(400, "Invalid year provided", requestId);
        }
        if (
          typeof query.quarter !== "string" ||
          !quarters.includes(query.quarter as Quarter)
        ) {
          return createErrorResult(400, "Invalid quarter provided", requestId);
        }
        // Validate building/room parameters.
        if (!query.building && query.room) {
          return createErrorResult(
            400,
            "You must provide a building code if you provide a room number",
            requestId
          );
        }
        // Validate optional parameters.
        for (const [param, validParams] of Object.entries({
          division: Object.keys(divisions),
          sectionType: sectionTypes,
          fullCourses: fullCoursesOptions,
          cancelledCourses: cancelledCoursesOptions,
        })) {
          if (
            !isValidOptionalParameter(query, param, validParams as unknown[])
          ) {
            return createErrorResult(
              400,
              `Invalid value for parameter ${param} provided`,
              requestId
            );
          }
        }
        // Validate all other scalar parameters.
        for (const param of [
          "ge",
          "department",
          "building",
          "room",
          "instructorName",
          "courseTitle",
          "startTime",
          "endTime",
          "maxCapacity",
        ]) {
          if (Array.isArray(query[param])) {
            return createErrorResult(
              400,
              `Parameter ${param} cannot be provided more than once`,
              requestId
            );
          }
        }
        const term: Term = {
          year: query.year,
          quarter: query.quarter as Quarter,
        };
        let queries: Array<WebsocAPIOptions | undefined> =
          normalizeQuery(query);
        let ret: WebsocAPIResponse = { schools: [] };
        // Determine whether to enable caching for this request.
        if (!query.cache || query.cache !== "false") {
          const docClient = new DDBDocClient();
          const tableName = "peterportal-api-next-websoc-cache";
          const sortKey: SortKey = {
            name: "invalidateBy",
            value: Date.now(),
            cmp: ">=",
          };
          const lambdaClient = new LambdaClient({});
          // For each normalized query:
          // Check the cache for that query. If hit, merge the result with the
          // result to be returned, set that query to ``undefined``, and go to
          // the next query. Otherwise, dispatch the cache updater.
          for (const [i, q] of Object.entries(queries)) {
            if (!q) continue;
            try {
              const items = (
                await docClient.query(
                  tableName,
                  { name: "requestHash", value: hash([term, q]) },
                  sortKey
                )
              )?.Items;
              if (items?.length) {
                queries[parseInt(i)] = undefined;
                ret = combineResponses(items.slice(-1)[0].data, ret);
                continue;
              } else {
                await dispatchCacheUpdater(lambdaClient, tableName, term, q);
              }
            } catch (e) {
              continue;
            }
            if (!isTwiceCacheable(q)) continue;
            if (q.department) {
              try {
                const items = (
                  await docClient.query(
                    tableName,
                    {
                      name: "requestHash",
                      value: hash([
                        term,
                        { department: q.department } as WebsocAPIOptions,
                      ]),
                    },
                    sortKey
                  )
                )?.Items;
                if (items?.length) {
                  queries[parseInt(i)] = undefined;
                  const data: WebsocAPIResponse = items.slice(-1)[0].data;
                  data.schools[0].departments[0].courses =
                    data.schools[0].departments[0].courses.filter(
                      (x) => x.courseNumber === q.courseNumber
                    );
                  ret = combineResponses(data, ret);
                } else {
                  await dispatchCacheUpdater(lambdaClient, tableName, term, {
                    department: q.department,
                  });
                }
              } catch (e) {
                continue;
              }
            }
            if (q.sectionCodes) {
              const sectionCodes = q.sectionCodes.split(",");
              try {
                const items = await Promise.all(
                  sectionCodes.map((sectionCode) =>
                    docClient
                      .query(
                        tableName,
                        {
                          name: "requestHash",
                          value: hash([
                            term,
                            { sectionCodes: sectionCode } as WebsocAPIOptions,
                          ]),
                        },
                        sortKey
                      )
                      .then((x) => x?.Items)
                  )
                );
                if (items.every((x) => x?.length)) {
                  queries[parseInt(i)] = undefined;
                  ret = combineResponses(
                    ...items.map(
                      (x): WebsocAPIResponse => x?.slice(-1)[0].data
                    ),
                    ret
                  );
                } else {
                  await Promise.all(
                    sectionCodes.map((sectionCode) =>
                      dispatchCacheUpdater(lambdaClient, tableName, term, {
                        sectionCodes: sectionCode,
                      })
                    )
                  );
                }
              } catch (e) {
                // noop
              }
            }
          }
          // Filter out the queries that have been set to ``undefined``,
          // i.e. the ones we have fulfilled through the cache already.
          queries = queries.filter((q) => q);
        }
        // For each remaining query:
        // Collect them into an iterable of ``Promises`` and fire them in parallel.
        // Check if each result fulfilled or rejected; merge the data of each
        // fulfilled response into the final response and remove it from the
        // array of queries. If there are still responses remaining, wait for 1
        // second and repeat the process.
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
              queries[parseInt(i)] = undefined;
              ret = combineResponses(r.value, ret);
            }
          }
          queries = queries.filter((q) => q);
          if (!queries.length) break;
          await sleep(1000);
        }
        // Sort the response and return it.
        return createOKResult(sortResponse(ret), requestId);
      } catch (e) {
        return createErrorResult(500, e, requestId);
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
