import fetch from "cross-fetch";
import { GraphQLError } from "graphql/error";
import type {
  RawResponse,
  Term,
  WebsocAPIResponse,
} from "peterportal-api-next-types";
import { isErrorResponse } from "peterportal-api-next-types";
import { encode } from "querystring";
import type { WebsocAPIOptions } from "websoc-api-next";

export default {
  Query: {
    async websoc(
      _: never,
      args: Partial<Term & WebsocAPIOptions>
    ): Promise<WebsocAPIResponse> {
      const res: RawResponse<WebsocAPIResponse> = await (
        await fetch(
          `${
            process.env.NODE_ENV === "development"
              ? `http://localhost:${process.env.PORT || 8080}`
              : "https://api-next.peterportal.org"
          }/v1/rest/websoc?${encode(args)}`
        )
      ).json();
      if (isErrorResponse(res))
        throw new GraphQLError(res.message, {
          extensions: { code: res.error.toUpperCase().replace(" ", "_") },
        });
      return res.payload;
    },
  },
};
