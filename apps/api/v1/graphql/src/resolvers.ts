import type { ApolloServerOptions, BaseContext } from "@apollo/server";

import { geTransform, proxyRestApi } from "./lib";

/**
 * Convention: either the route provided to {@link proxyRestApi} should start with a slash,
 * or the fetch request should add a slash. For now, the latter will be used
 */
export const resolvers: ApolloServerOptions<BaseContext>["resolvers"] = {
  Query: {
    calendar: proxyRestApi("v1/rest/calendar"),
    course: proxyRestApi("v1/rest/courses", { pathArg: "courseId" }),
    courses: proxyRestApi("v1/rest/courses", { argsTransform: geTransform }),
    allCourses: proxyRestApi("v1/rest/courses/all"),
    rawGrades: proxyRestApi("v1/rest/grades/raw", { argsTransform: geTransform }),
    aggregateGrades: proxyRestApi("v1/rest/grades/aggregate", { argsTransform: geTransform }),
    gradesOptions: proxyRestApi("v1/rest/grades/options", { argsTransform: geTransform }),
    aggregateByCourse: proxyRestApi("v1/rest/grades/aggregateByCourse", {
      argsTransform: geTransform,
    }),
    aggregateByOffering: proxyRestApi("v1/rest/grades/aggregateByOffering", {
      argsTransform: geTransform,
    }),
    instructor: proxyRestApi("v1/rest/instructors", { pathArg: "courseId" }),
    instructors: proxyRestApi("v1/rest/instructors"),
    allInstructors: proxyRestApi("v1/rest/instructors/all"),
    larc: proxyRestApi("v1/rest/larc"),
    websoc: proxyRestApi("v1/rest/websoc", { argsTransform: geTransform }),
    week: proxyRestApi("v1/rest/week"),
  },
};
