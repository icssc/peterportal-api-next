# api-route-graphql

This directory contains the logic for the GraphQL endpoint of the API. It is slightly different from all the other routes in its parent directory since it serves a complete app (Apollo Server) as opposed to a single endpoint.

To add GraphQL support for a REST route:

1. Create a schema under `schema/`. It should include all necessary types, and extend the `Query` type with the appropriate field.
2. Create a resolver under `resolver/` with the same name as the schema. Its default export should have the following shape:

```ts
{
  Query: {
    resolverName: Function;
  }
}
```

In most cases, you can just have `resolverName` be a call to `lib.restResolverFactory` with the appropriate parameters. However, if you know what you are doing, you can also write your own resolver.
