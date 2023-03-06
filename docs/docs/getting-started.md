---
pagination_prev: null
pagination_next: null
---

# Getting Started

## What is an API?

API stands for **A**pplication **P**rogramming **I**nterface. In essence, it is a way for programs to communicate with each other using a set of agreed-upon definitions and protocols.

PeterPortal API offers both REST and GraphQL APIs, both of which use standard HTTP verbs and status codes, and return structured data using JSON.

## What is the difference between REST and GraphQL?

REST stands for **RE**presentational **S**tate **T**ransfer. A REST API has endpoints, each of which represents a resource. When a request is made to an endpoint, the server responds with a representation of the state of the resource, hence the name. Each HTTP verb (`GET`, `POST`, etc.) represents a different action on the resource being requested.

GraphQL is a query language for APIs. It is more flexible than REST, since you can query multiple endpoints in the same request, and also include only fields from the endpoint(s) that are relevant. However, it does have a slightly higher learning curve, and may require additional work to integrate into your application.

The correct API to use will almost always depend on your use case; there is no single correct answer.

## How do I start using PeterPortal API?

Unlike some other Web APIs, PeterPortal API does not require API keys or authentication, so you can start using this API immediately. However, in order to ensure a good experience for all users of the API, we ask that you read and abide by the [Fair Use Policy](fair-use-policy).
