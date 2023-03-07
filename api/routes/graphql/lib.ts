import fetch from "cross-fetch";
import { GraphQLError } from "graphql/error";
import type { RawResponse } from "peterportal-api-next-types";
import { isErrorResponse } from "peterportal-api-next-types";
import type { ParsedUrlQueryInput } from "querystring";
import { encode } from "querystring";

/**
 * Returns a resolver function for a specific GraphQL field that queries the
 * specified REST endpoint.
 *
 * The resolver function takes in the parent argument (which is unused) and an
 * object that contains all GraphQL arguments provided for this field. It then
 * constructs a GET request to send to the given REST endpoint. If the response
 * is an error, then it throws a ``GraphQLError``, which causes the server to
 * return an error response compliant with the GraphQL specification. Otherwise,
 * it returns the payload from the response, which the server returns as data.
 * @param path The path to the REST endpoint.
 * @param transform A function that transforms the arguments passed to the
 * resolver. Defaults to the identity function, if no transformation is needed.
 */
export const restResolverFactory =
  (
    path: string,
    transform: (args: ParsedUrlQueryInput) => ParsedUrlQueryInput = (args) =>
      args
  ) =>
  async (_: never, args: ParsedUrlQueryInput): Promise<unknown> => {
    const res: RawResponse<unknown> = await (
      await fetch(`${process.env.BASE_URL}${path}?${encode(transform(args))}`)
    ).json();
    if (isErrorResponse(res))
      throw new GraphQLError(res.message, {
        extensions: { code: res.error.toUpperCase().replace(" ", "_") },
      });
    return res.payload;
  };
