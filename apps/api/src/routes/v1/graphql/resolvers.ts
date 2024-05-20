import type { ApolloServerOptions, BaseContext } from "@apollo/server";

import { geTransform, proxyRestApi } from "./lib";

export const resolvers: ApolloServerOptions<BaseContext>["resolvers"] = {
  Query: {
    allTermDates: proxyRestApi("/v1/rest/calendar"),
    calendar: proxyRestApi("/v1/rest/calendar"),
    course: proxyRestApi("/v1/rest/courses", { pathArg: "courseId" }),
    courses: proxyRestApi("/v1/rest/courses", { argsTransform: geTransform }),
    allCourses: proxyRestApi("/v1/rest/courses/all"),
    major: proxyRestApi("/v1/rest/degrees/majors"),
    majors: proxyRestApi("/v1/rest/degrees/majors"),
    minor: proxyRestApi("/v1/rest/degrees/minors"),
    minors: proxyRestApi("/v1/rest/degrees/minors"),
    specialization: proxyRestApi("/v1/rest/degrees/specializations"),
    specializations: proxyRestApi("/v1/rest/degrees/specializations"),
    specializationsByMajorId: proxyRestApi("/v1/rest/degrees/specializations"),
    allDegrees: proxyRestApi("/v1/rest/degrees/all"),
    enrollmentHistory: proxyRestApi("/v1/rest/enrollmentHistory"),
    rawGrades: proxyRestApi("/v1/rest/grades/raw"),
    aggregateGrades: proxyRestApi("/v1/rest/grades/aggregate"),
    gradesOptions: proxyRestApi("/v1/rest/grades/options"),
    aggregateByCourse: proxyRestApi("/v1/rest/grades/aggregateByCourse", {
      argsTransform: geTransform,
    }),
    aggregateByOffering: proxyRestApi("/v1/rest/grades/aggregateByOffering", {
      argsTransform: geTransform,
    }),
    instructor: proxyRestApi("/v1/rest/instructors", { pathArg: "ucinetid" }),
    instructors: proxyRestApi("/v1/rest/instructors"),
    allInstructors: proxyRestApi("/v1/rest/instructors/all"),
    larc: proxyRestApi("/v1/rest/larc"),
    studyRooms: proxyRestApi("/v1/rest/studyrooms"),
    allStudyRooms: proxyRestApi("/v1/rest/studyrooms/all"),
    websoc: proxyRestApi("/v1/rest/websoc", { argsTransform: geTransform }),
    depts: proxyRestApi("/v1/rest/websoc/depts"),
    terms: proxyRestApi("/v1/rest/websoc/terms"),
    week: proxyRestApi("/v1/rest/week"),
  },
};
