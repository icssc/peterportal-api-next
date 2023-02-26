import type { Term, WebsocAPIResponse } from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";

import { restResolverFactory } from "../lib";

export default {
  Query: {
    websoc: restResolverFactory<Term & WebsocAPIOptions, WebsocAPIResponse>(
      "/v1/rest/websoc"
    ),
  },
};
