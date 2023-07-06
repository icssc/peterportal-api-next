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

export function createGraphqlExpressMiddleware() {
  graphqlServer.start().catch(() => []);
  return expressMiddleware(graphqlServer);
}

/**
 * "The inferred type of ... cannot be named without a reference ..."
 * @see https://github.com/microsoft/TypeScript/issues/42873
 */
export const lambdaHandler = startServerAndCreateLambdaHandler(
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
