---
pagination_prev: null
pagination_next: null
---

# Application Architecture

PeterPortal API consists of four main components:

- the API,
- the documentation for the API (that's this site!),
- the maintenance tooling used to keep the API's data up to date,
- and various services that the API or its tooling uses.

Broadly speaking, each of these components are managed by an [AWS CDK](https://aws.amazon.com/cdk/) application. This allows us to manage almost all of our infrastructure as code, with a few notable exceptions.
