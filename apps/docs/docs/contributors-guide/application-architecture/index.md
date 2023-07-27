---
pagination_prev: null
pagination_next: null
---

# Application Architecture

PeterPortal API consists of four main components:

- the API,
- the maintenance tooling used to keep the API's data up to date,
- the documentation for the API (that's this site!),
- and various services that the API or its tooling uses.

Broadly speaking, each of these components are managed by an [AWS CDK](https://aws.amazon.com/cdk/) application. This allows us to manage almost all of our infrastructure as code, with a few notable exceptions. The first two components are rather more complex, so they get their own pages.

## Documentation

This is a bit meta, isn't it? You know, reading documentation about the API's documentation site on the API's documentation site?

Anyway, our documentation is built with [Docusaurus](https://docusaurus.io/), so adding new documentation is as easy as writing standard Markdown. For fancier docs, Docusaurus also supports MDX and React, which is why we're able to provide [Apollo Sandbox](https://www.apollographql.com/docs/graphos/explorer/sandbox/) within the documentation site for all your GraphQL experimentation needs.

When the time comes to deploy the site to staging or production, the built contents are uploaded into an [S3](https://aws.amazon.com/s3/) bucket, then served using a [CloudFront](https://aws.amazon.com/cloudfront/) distribution to the desired subdomain.

## Services

### WebSoc Proxy Service

The `websoc-proxy-service` encapsulates the `@libs/websoc-api-next` module, allowing the WebSoc route to invoke it only when requests to WebSoc are necessary. This improves performance for cached responses, since fetching and parsing WebSoc responses are slow and require additional machinery. Like most services used in/by the API, the WebSoc proxy service is deployed as a Lambda, and is warmed every five minutes to minimize latency caused by cold starts.
