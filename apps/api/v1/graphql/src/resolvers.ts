import type { ApolloServerOptions, BaseContext } from "@apollo/server";

import { proxyRestApi } from "./lib";

/**
 * Convention: either the route provided to {@link proxyRestApi} should start with a slash,
 * or the fetch request should add a slash. For now, the latter will be used
 */
export const resolvers: ApolloServerOptions<BaseContext>["resolvers"] = {
  Query: {
    calendar: proxyRestApi("v1/rest/calendar"),
    course: proxyRestApi("v1/rest/courses/", (args) => args, "courseId"),
    rawGrades: proxyRestApi("v1/rest/grades/raw"),
    aggregateGrades: proxyRestApi("v1/rest/grades/aggregate"),
    gradesOptions: proxyRestApi("v1/rest/grades/options"),
    instructor: proxyRestApi("v1/rest/instructors", (args) => args, "ucinetid"),
    websoc: proxyRestApi("v1/rest/websoc", (args) => {
      if (args.ge) return { ...args, ge: args.ge.replace("_", "-") };
      delete args.ge;
      return args;
    }),
    week: proxyRestApi("v1/rest/week"),
  },
};
