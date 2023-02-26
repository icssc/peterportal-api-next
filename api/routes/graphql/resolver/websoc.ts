import { restResolverFactory } from "../lib";

export default {
  Query: {
    websoc: restResolverFactory("/v1/rest/websoc"),
  },
};
