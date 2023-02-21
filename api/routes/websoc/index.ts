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
import { DDBDocClient } from "ddb";
import hash from "object-hash";
import type {
  CancelledCourses,
  Division,
  FullCourses,
  GE,
  Quarter,
  SectionType,
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

const validateOptionalParameters = (
  query: Record<string, string | string[] | undefined>,
  param: string,
  validParams: unknown[]
): boolean =>
  !(
    query[param] &&
    (typeof query[param] !== "string" ||
      (!validParams.includes(query[param]) && query[param] !== "ANY"))
  );

const normalizeVector = (vec: string | string[] | undefined): string[] =>
  Array.from(
    new Set(
      typeof vec === "undefined"
        ? [""]
        : typeof vec === "string"
        ? vec.split(",")
        : vec.map((x) => x.split(",")).flat()
    )
  ).sort();

const normalizeQuery = (
  query: Record<string, string | string[] | undefined>
): WebsocAPIOptions[] => {
  const baseQuery = {
    ge: query.ge as GE,
    department: query.department as string,
    building: query.building as string,
    room: query.room as string,
    division: query.division as Division,
    courseNumber: normalizeVector(query.courseNumber).join(","),
    instructorName: query.instructorName as string,
    courseTitle: query.courseTitle as string,
    sectionType: query.sectionType as SectionType,
    days: normalizeVector(query.days).join(","),
    startTime: query.startTime as string,
    endTime: query.endTime as string,
    maxCapacity: query.maxCapacity as string,
    fullCourses: query.fullCourses as FullCourses,
    cancelledCourses: query.cancelledCourses as CancelledCourses,
  };
  const sectionCodeArray = normalizeVector(query.sectionCodes);
  return normalizeVector(query.units)
    .map((units) => ({ ...baseQuery, units }))
    .map((q) =>
      Array.from(Array(Math.ceil(sectionCodeArray.length / 5)).keys()).map(
        (x) => ({
          ...q,
          sectionCodes: sectionCodeArray.slice(x * 5, (x + 1) * 5).join(","),
        })
      )
    )
    .flat();
};

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
        c.sections.sort(
          (a, b) => parseInt(a.sectionCode) - parseInt(b.sectionCode)
        );
      });
      d.courses.sort(
        (a, b) =>
          parseInt(a.courseNumber.replace(/\D/g, "")) -
          parseInt(b.courseNumber.replace(/\D/g, ""))
      );
    });
    s.departments.sort((a, b) =>
      a.deptCode === b.deptCode ? 0 : a.deptCode > b.deptCode ? 1 : -1
    );
  });
  combined.schools.sort((a, b) =>
    a.schoolName === b.schoolName ? 0 : a.schoolName > b.schoolName ? 1 : -1
  );
  return combined;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dispatchCacheUpdater = async (
  lambdaClient: LambdaClient,
  tableName: string,
  term: Term,
  query: WebsocAPIOptions
): Promise<void> => {
  if (process.env.NODE_ENV === "development") return;
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

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  switch (method) {
    case "GET":
    case "HEAD":
      try {
        {
          /* region Validate required parameters. */
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
            return createErrorResult(
              400,
              "Invalid quarter provided",
              requestId
            );
          }
          /* endregion */
          /* region Validate building/room options. */
          if (!query.building && query.room) {
            return createErrorResult(
              400,
              "You must provide a building code if you provide a room number",
              requestId
            );
          }
          /* endregion */
          /* region Validate optional parameters that have a set of valid values. */
          for (const [param, validParams] of Object.entries({
            division: Object.keys(divisions),
            sectionType: sectionTypes,
            fullCourses: fullCoursesOptions,
            cancelledCourses: cancelledCoursesOptions,
          })) {
            if (
              !validateOptionalParameters(
                query,
                param,
                validParams as unknown[]
              )
            ) {
              return createErrorResult(
                400,
                `Invalid value for parameter ${param} provided`,
                requestId
              );
            }
          }
          /* endregion */
          /* region Validate all other parameters which must be scalars. */
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
          /* endregion */
          const term: Term = {
            year: query.year,
            quarter: query.quarter as Quarter,
          };
          let queries: Array<WebsocAPIOptions | undefined> =
            normalizeQuery(query);
          let ret: WebsocAPIResponse = { schools: [] };
          if (!query.cache || query.cache !== "false") {
            const docClient = new DDBDocClient();
            const lambdaClient = new LambdaClient({
              region: process.env.AWS_REGION,
            });
            const timestamp = Date.now();
            for (const [i, q] of Object.entries(queries)) {
              if (!q) continue;
              try {
                const tableName = "peterportal-api-next-websoc-primary-cache";
                const items = (
                  await docClient.query(
                    tableName,
                    { name: "requestHash", value: hash([term, q]) },
                    { name: "invalidateBy", value: timestamp, cmp: "<=" }
                  )
                )?.Items;
                if (items) {
                  queries[parseInt(i)] = undefined;
                  ret = combineResponses(items.slice(-1)[0].data, ret);
                } else {
                  await dispatchCacheUpdater(lambdaClient, tableName, term, q);
                }
              } catch {
                continue;
              }
              try {
                if (!q.ge && !q.department) continue;
                const tableName = "peterportal-api-next-websoc-secondary-cache";
                const items = (
                  await docClient.query(
                    tableName,
                    {
                      name: "requestHash",
                      value: hash([term, [q.ge, q.department]]),
                    },
                    { name: "invalidateBy", value: timestamp, cmp: "<=" }
                  )
                )?.Items;
                if (items) {
                  // TODO implement filtering by query on cache hit
                } else {
                  await dispatchCacheUpdater(lambdaClient, tableName, term, {
                    ge: q.ge,
                    department: q.department,
                    sectionCodes: "",
                  });
                }
              } catch {
                // noop
              }
            }
            queries = queries.filter((q) => q);
          }
          while (queries.length) {
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
            await sleep(1000);
          }
          return createOKResult(ret, requestId);
        }
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
