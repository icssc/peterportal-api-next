import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";

const typeDefs = `#graphql
type Book {
  title: String
  author: String
}
type Query {
  books: [Book]
}
`;

const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];

const resolvers = {
  Query: {
    books: () => books,
  },
};

export const graphqlServer = new ApolloServer({
  typeDefs,
  resolvers,
});

export const lambdaHandler = startServerAndCreateLambdaHandler(
  graphqlServer,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
