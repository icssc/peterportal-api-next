import { BaseContext } from "@apollo/server/dist/cjs";
import { IFieldResolver } from "@graphql-tools/utils/typings";
import { GraphQLError } from "graphql/error";
import { isErrorResponse, RawResponse } from "peterportal-api-next-types";

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

export const proxyRestApi =
  (
    route: string,
    argsTransform: (args: Record<string, string>) => Record<string, string> = (args) => args,
    pathArg?: string,
  ): IFieldResolver<never, BaseContext> =>
  async (_source, args, _context, _info) => {
    const urlSearchParams = new URLSearchParams(argsTransform(args));

    const query = urlSearchParams.toString();

    const data: RawResponse<unknown> = await fetch(
      pathArg
        ? `${getBaseUrl()}/${route}/${args[pathArg]}`
        : `${getBaseUrl()}/${route}${query ? "?" + query : ""}`,
    )
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
