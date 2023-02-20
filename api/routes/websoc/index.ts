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
import type {
  CancelledCourses,
  Division,
  FullCourses,
  GE,
  Quarter,
  SectionType,
  Term,
  WebsocAPIResponse,
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
        ? []
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
  const unitArray = normalizeVector(query.units);
  const sectionCodeArray = normalizeVector(query.sectionCodes);
  return unitArray
    .map((units) => ({ ...baseQuery, units }))
    .map((q) =>
      Array(Math.ceil(sectionCodeArray.length / 5)).map((x) => ({
        ...q,
        sectionCodes: sectionCodeArray.slice(x * 5, (x + 1) * 5).join(","),
      }))
    )
    .flat();
};

const combineResponses = (...responses: WebsocAPIResponse[]) => {
  const combined = responses.shift();
  if (!combined) return { schools: [] };
  for (const res of responses) {
    for (const school of res.schools) {
      const schoolIndex = combined.schools.findIndex(
        (s) => s.schoolName === school.schoolName
      );
      if (schoolIndex !== -1) {
        for (const dept of school.departments) {
          const deptIndex = combined.schools[schoolIndex].departments.findIndex(
            (d) => d.deptCode === dept.deptCode
          );
          if (deptIndex !== -1) {
            const courses = new Set(
              combined.schools[schoolIndex].departments[deptIndex].courses
            );
            for (const course of dept.courses) {
              courses.add(course);
            }
            const coursesArray = Array.from(courses);
            coursesArray.sort(
              (left, right) =>
                parseInt(left.courseNumber.replace(/\D/g, "")) -
                parseInt(right.courseNumber.replace(/\D/g, ""))
            );
            combined.schools[schoolIndex].departments[deptIndex].courses =
              coursesArray;
          } else {
            combined.schools[schoolIndex].departments.push(dept);
          }
        }
      } else {
        combined.schools.push(school);
      }
    }
  }
  return combined;
};

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query, requestId } = request.getParams();
  switch (method) {
    case "GET":
    case "HEAD": {
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
          "You must provide at least one of ge, department, sectionCode, or instructorName",
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
      /* endregion */
      /* region Validate building/room options. */
      if (!query.building && query.room) {
        return createErrorResult(
          400,
          "You must specify a building code if you specify a room number",
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
          !validateOptionalParameters(query, param, validParams as unknown[])
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
      let queries = normalizeQuery(query);
      if (!query.cache || query.cache !== "false") {
        // TODO implement cache
      }
      let ret: WebsocAPIResponse = { schools: [] };
      while (queries.length) {
        const res = await Promise.allSettled(
          queries.map((options) => callWebSocAPI(term, options))
        );
        for (const [i, r] of Object.entries(res)) {
          if ("value" in r) {
            queries[parseInt(i)] = undefined as unknown as WebsocAPIOptions;
            ret = combineResponses(ret, r.value);
          }
          queries = queries.filter((q) => q);
        }
      }
      return createOKResult(ret, requestId);
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
