import { join } from "node:path";
import { parse } from "node:url";

import { ApolloServer, HeaderMap, HTTPGraphQLRequest } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { compress, logger } from "@libs/lambda";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

import { transformBody } from "./lib";
import { resolvers } from "./resolvers";

const responseHeaders: APIGatewayProxyResult["headers"] = {
  "Access-Control-Allow-Headers": "Apollo-Require-Preflight, Content-Type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const graphqlServer = new ApolloServer({
  introspection: true,
  plugins: [
    process.env.NODE_ENV === "development"
      ? ApolloServerPluginLandingPageLocalDefault()
      : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
  ],
  resolvers,
  typeDefs: mergeTypeDefs(loadFilesSync(join(__dirname, "schema/*.graphql"))),
});

export const ANY: APIGatewayProxyHandler = async (event) => {
  const { body, headers: eventHeaders, httpMethod: method } = event;

  try {
    graphqlServer.assertStarted("");
  } catch {
    await graphqlServer.start();
  }

  const req: HTTPGraphQLRequest = {
    body: typeof body === "string" ? JSON.parse(body.replaceAll("\n", "\\n")) : body,
    headers: Object.entries(eventHeaders).reduce(
      (m, [k, v]) => m.set(k, Array.isArray(v) ? v.join(", ") : v ?? ""),
      new HeaderMap(),
    ),
    method,
    search: parse(event.path ?? "").search ?? "",
  };
  logger.info(JSON.stringify(req));
  const res = await graphqlServer.executeHTTPGraphQLRequest({
    httpGraphQLRequest: req,
    context: async () => ({}),
  });

  const statusCode = res.status ?? 200;
  res.headers.forEach((v, k) => (responseHeaders[k] = v));

  try {
    const { body, method } = compress(
      await transformBody(res.body),
      req.headers.get("accept-encoding"),
    );
    if (method) {
      responseHeaders["content-encoding"] = method;
    }
    return {
      body,
      headers: responseHeaders,
      isBase64Encoded: !!method,
      statusCode,
    };
  } catch {
    return {
      body: "",
      headers: responseHeaders,
      statusCode: 500,
    };
  }
};
