import path from "node:path";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { handlers, startServerAndCreateLambdaHandler } from "@as-integrations/aws-lambda";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { createOKResult, type InternalHandler, type InternalRequest } from "ant-stack";
import { getClosestProjectDirectory } from "ant-stack/utils";

const projectDirectory = getClosestProjectDirectory();

const graphqlServer = new ApolloServer({
  introspection: true,
  plugins: [
    process.env.NODE_ENV === "development"
      ? ApolloServerPluginLandingPageLocalDefault()
      : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
  ],
  // resolvers,
  typeDefs: mergeTypeDefs(loadFilesSync(path.join(projectDirectory, "src", "graphql/*.graphql"))),
});

/**
 * "The inferred type of ... cannot be named without a reference ..."
 * @see https://github.com/microsoft/TypeScript/issues/42873
 */
export function createGraphqlExpressMiddleware(): ReturnType<typeof expressMiddleware> {
  graphqlServer.start().catch(() => []);
  return expressMiddleware(graphqlServer);
}

/**
 * "The inferred type of ... cannot be named without a reference ..."
 * @see https://github.com/microsoft/TypeScript/issues/42873
 */
export const lambdaHandler: ReturnType<typeof startServerAndCreateLambdaHandler> =
  startServerAndCreateLambdaHandler(
    graphqlServer,
    handlers.createAPIGatewayProxyEventRequestHandler(),
    {
      middleware: [
        async () => {
          return async (res) => {
            res.headers = {
              ...res.headers,
              "Access-Control-Allow-Headers": "Apollo-Require-Preflight, Content-Type",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            };
          };
        },
      ],
    }
  );

/**
 * {@link InternalHandler} only receives an {@link InternalRequest}, not context or callback from AWS Lambda.
 */
const placeholder: any = {};

export const ALL: InternalHandler = async (request) => {
  const lambdaHandlerResponse = await lambdaHandler(request, placeholder, placeholder);
  return createOKResult(lambdaHandlerResponse, request.requestId);
};
