import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { handlers, startServerAndCreateLambdaHandler } from "@as-integrations/aws-lambda";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import resolvers from "./resolvers";

let cwd = "";
try {
  cwd = import.meta.url ? dirname(fileURLToPath(import.meta.url)) : __dirname;
  // eslint-disable-next-line no-empty
} catch {}

const graphqlServer = new ApolloServer({
  introspection: true,
  plugins: [
    process.env.NODE_ENV === "development"
      ? ApolloServerPluginLandingPageLocalDefault()
      : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
  ],
  resolvers,
  typeDefs: mergeTypeDefs(loadFilesSync(join(cwd, "schema/*.graphql"))),
});

export const expressHandlerFactory = () => {
  graphqlServer.start().catch(() => []);
  return expressMiddleware(graphqlServer);
};

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
