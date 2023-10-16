import type { ApolloServerOptions, BaseContext } from "@apollo/server";

import { geTransform, proxyRestApi } from "./lib";

export const resolvers: ApolloServerOptions<BaseContext>["resolvers"] = {
  Query: {
    calendar: proxyRestApi("v1/rest/calendar"),
    course: proxyRestApi("v1/rest/courses", { pathArg: "courseId" }),
    courses: proxyRestApi("v1/rest/courses", { argsTransform: geTransform }),
    allCourses: proxyRestApi("v1/rest/courses/all"),
    rawGrades: proxyRestApi("v1/rest/grades/raw"),
    aggregateGrades: proxyRestApi("v1/rest/grades/aggregate"),
    gradesOptions: proxyRestApi("v1/rest/grades/options"),
    aggregateByCourse: proxyRestApi("v1/rest/grades/aggregateByCourse", {
      argsTransform: geTransform,
    }),
    aggregateByOffering: proxyRestApi("v1/rest/grades/aggregateByOffering", {
      argsTransform: geTransform,
    }),
    instructor: proxyRestApi("v1/rest/instructors", { pathArg: "ucinetid" }),
    instructors: proxyRestApi("v1/rest/instructors"),
    allInstructors: proxyRestApi("v1/rest/instructors/all"),
    larc: proxyRestApi("v1/rest/larc"),
    websoc: proxyRestApi("v1/rest/websoc", { argsTransform: geTransform }),
    depts: proxyRestApi("v1/rest/websoc/depts"),
    terms: proxyRestApi("v1/rest/websoc/terms"),
    week: proxyRestApi("v1/rest/week"),
  },
};
