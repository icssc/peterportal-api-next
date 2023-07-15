import type { ApolloServerOptions, BaseContext } from "@apollo/server";
import type { IFieldResolver } from "@graphql-tools/utils";
import { GraphQLError } from "graphql/error";
import { isErrorResponse, type RawResponse } from "peterportal-api-next-types";

/**
 * Convention: either the route provided to {@link proxyRestApi} should start with a slash,
 * or the fetch request should add a slash. For now, the latter will be used
 */
export const resolvers: ApolloServerOptions<BaseContext>["resolvers"] = {
  Query: {
    calendar: proxyRestApi("v1/rest/calendar"),
    websoc: proxyRestApi("v1/rest/websoc"),
  },
};

const baseUrl = getBaseUrl();

export function proxyRestApi(route: string): IFieldResolver<never, BaseContext> {
  return async (_source, args, _context, _info) => {
    const urlSearchParams = new URLSearchParams(args);

    const query = urlSearchParams.toString();

    const data: RawResponse<unknown> = await fetch(`${baseUrl}/${route}${query ? "?" + query : ""}`)
      .then((res) => res.json())
      .catch((err) => {
        return {
          error: `INTERNAL_SERVER_ERROR: ${err.message}`,
          message: err.message,
        };
      });

    if (isErrorResponse(data)) {
      throw new GraphQLError(data.message, {
        extensions: {
          code: data.error.toUpperCase().replace(" ", "_"),
        },
      });
    }

    return data.payload;
  };
}

function getBaseUrl() {
  switch (process.env.NODE_ENV) {
    case "prod":
    case "production":
      return `https://api-next.peterportal.org`;

    case "development":
      return `http://localhost:${process.env.API_PORT ?? 8080}`;

    case "staging":
    default:
      return `https://${process.env.STAGE}.api-next.peterportal.org`;
  }
}