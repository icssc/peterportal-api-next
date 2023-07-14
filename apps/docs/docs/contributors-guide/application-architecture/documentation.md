---
pagination_prev: null
pagination_next: null
---

# Documentation

This is a bit meta, isn't it? You know, reading documentation about the API's documentation site on the API's documentation site?

Anyway, our documentation is built with [Docusaurus](https://docusaurus.io/), so adding new documentation is as easy as writing standard Markdown. For fancier docs, Docusaurus also supports MDX and React, which is why we're able to provide [Apollo Sandbox](https://www.apollographql.com/docs/graphos/explorer/sandbox/) within the documentation site for all your GraphQL experimentation needs.

When the time comes to deploy the site to staging or production, the built contents are uploaded into an [S3](https://aws.amazon.com/s3/) bucket, then served using a [CloudFront](https://aws.amazon.com/cloudfront/) distribution to the desired subdomain.
