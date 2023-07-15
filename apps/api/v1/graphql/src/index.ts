import path from "node:path";
import url from "node:url";

import { ApolloServer, HTTPGraphQLRequest, HTTPGraphQLResponse, HeaderMap } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import type { InternalHandler } from "ant-stack";
import { getClosestProjectDirectory } from "ant-stack/utils";
import type { APIGatewayProxyResult } from "aws-lambda";

import { resolvers } from "./resolvers";

/**
 * {@link __dirname} is injected by ESBuild
 */
const projectDirectory = getClosestProjectDirectory(__dirname);

const graphqlServer = new ApolloServer({
  introspection: true,
  plugins: [
    process.env.NODE_ENV === "development"
      ? ApolloServerPluginLandingPageLocalDefault()
      : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
  ],
  resolvers,
  typeDefs: mergeTypeDefs(loadFilesSync(path.join(projectDirectory, "src", "graphql/*.graphql"))),
});

export const ANY: InternalHandler = async (request) => {
  try {
    graphqlServer.assertStarted("");
  } catch {
    await graphqlServer.start();
  }

  const headers = Object.entries(request.headers).reduce((headerMap, [key, value]) => {
    return headerMap.set(key, Array.isArray(value) ? value.join(", ") : value);
  }, new HeaderMap());

  console.log(JSON.stringify(request, null, 2));

  const httpGraphQLRequest: HTTPGraphQLRequest = {
    method: request.method,
    headers,
    search: url.parse(request.path ?? "").search ?? "",
    body: request.body,
  };

  const httpGraphQLResponse = await graphqlServer.executeHTTPGraphQLRequest({
    httpGraphQLRequest,
    context: async () => ({}),
  });

  const resultStatusCode = httpGraphQLResponse.status ?? 200;

  const resultHeaders: APIGatewayProxyResult["headers"] = {
    "Access-Control-Allow-Headers": "Apollo-Require-Preflight, Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  httpGraphQLResponse.headers.forEach((value, key) => {
    resultHeaders[key] = value;
  });

  return {
    statusCode: resultStatusCode,
    headers: resultHeaders,
    body: await transformBody(httpGraphQLResponse.body),
  };
};

async function transformBody(body: HTTPGraphQLResponse["body"]): Promise<string> {
  if (body.kind === "complete") {
    return body.string;
  }

  let transformedBody = "";

  for await (const chunk of body.asyncIterator) {
    transformedBody += chunk;
  }

  return transformedBody;
}