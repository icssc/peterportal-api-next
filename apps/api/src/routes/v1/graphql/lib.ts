import type { RawResponse } from "@anteater-api/types";
import type { BaseContext, HTTPGraphQLResponse } from "@apollo/server";
import type { IFieldResolver } from "@graphql-tools/utils";
import { GraphQLError } from "graphql/error";

function getBaseUrl() {
  switch (process.env.NODE_ENV) {
    case "production":
      return `https://api-next.peterportal.org`;
    case "staging":
      return `https://${process.env.STAGE}.api-next.peterportal.org`;
    default:
      return `http://localhost:${process.env.API_PORT ?? 8080}`;
  }
}

export async function transformBody(body: HTTPGraphQLResponse["body"]): Promise<string> {
  if (body.kind === "complete") {
    return body.string;
  }
  let transformedBody = "";
  for await (const chunk of body.asyncIterator) {
    transformedBody += chunk;
  }
  return transformedBody;
}

export function geTransform(args: Record<string, string>) {
  if (args.ge) return { ...args, ge: args.ge.replace("_", "-") };
  delete args.ge;
  return args;
}

export const proxyRestApi =
  (
    route: string,
    proxyArgs?: {
      argsTransform?: (args: Record<string, string>) => Record<string, string>;
      pathArg?: string;
    },
  ): IFieldResolver<never, BaseContext> =>
  async (_source, args, _context, _info) => {
    const { argsTransform = (args: Record<string, string>) => args, pathArg } = proxyArgs ?? {};
    const urlSearchParams = new URLSearchParams(argsTransform(args));
    const query = urlSearchParams.toString();

    const data: RawResponse<unknown> = await fetch(
      pathArg
        ? `${getBaseUrl()}${route}/${args[pathArg]}`
        : `${getBaseUrl()}${route}${query ? "?" + query : ""}`,
    )
      .then((res) => res.json())
      .catch((err) => {
        return {
          error: `INTERNAL_SERVER_ERROR: ${err.message}`,
          message: err.message,
        };
      });

    if (!data.success) {
      throw new GraphQLError(data.message, {
        extensions: {
          code: data.error.toUpperCase().replace(" ", "_"),
        },
      });
    }

    return data.payload;
  };
