import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const cwd = import.meta.url
  ? dirname(fileURLToPath(import.meta.url))
  : __dirname;

const graphqlServer = new ApolloServer({
  typeDefs: mergeTypeDefs(loadFilesSync(join(cwd, "schema/*.graphql"))),
  resolvers: mergeResolvers(loadFilesSync(join(cwd, "resolver/*.{js,ts}"))),
  plugins: [
    process.env.NODE_ENV === "development"
      ? ApolloServerPluginLandingPageLocalDefault()
      : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
  ],
});

export const expressHandlerFactory = () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  graphqlServer.start().catch(() => {});
  return expressMiddleware(graphqlServer);
};

export const lambdaHandler = startServerAndCreateLambdaHandler(
  graphqlServer,
  handlers.createAPIGatewayProxyEventRequestHandler()
);
