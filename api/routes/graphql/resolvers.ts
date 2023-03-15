import { restResolverFactory } from "./lib";

export default {
  Query: {
    aggregateGrades: restResolverFactory("/v1/rest/grades/aggregate"),
    rawGrades: restResolverFactory("/v1/rest/grades/raw"),
    websoc: restResolverFactory("/v1/rest/websoc", (args) => ({
      ...args,
      ge: args.ge?.toString().replace("_", "-"),
    })),
  },
};
