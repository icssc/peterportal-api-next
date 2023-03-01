import fetch from "cross-fetch";
import { GraphQLError } from "graphql/error";
import type { RawResponse } from "peterportal-api-next-types";
import { isErrorResponse } from "peterportal-api-next-types";
import type { ParsedUrlQueryInput } from "querystring";
import { encode } from "querystring";

/**
 * Instantiates and returns a resolver that, when called, queries the specified
 * REST endpoint and returns the result.
 * @param path The path to the REST endpoint.
 * @param transform A function that transforms the arguments passed to the
 * resolver. Defaults to the identity function, if no transformation is needed.
 */
export const restResolverFactory = (
  path: string,
  transform: (args: ParsedUrlQueryInput) => ParsedUrlQueryInput = (args) => args
) => {
  return async (_: never, args: ParsedUrlQueryInput): Promise<unknown> => {
    const res: RawResponse<unknown> = await (
      await fetch(
        `${
          process.env.NODE_ENV === "development"
            ? `http://localhost:${process.env.API_PORT || 8080}`
            : `https://${
                process.env.STAGE === "prod" ? "" : `${process.env.STAGE}-`
              }api-next.peterportal.org`
        }${path}?${encode(transform(args))}`
      )
    ).json();
    if (isErrorResponse(res))
      throw new GraphQLError(res.message, {
        extensions: { code: res.error.toUpperCase().replace(" ", "_") },
      });
    return res.payload;
  };
};
