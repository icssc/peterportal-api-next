# 🐜 ant-stack

_what is this, a serverless stack for ants?_

## CLI

- Helps manage an AntStack project

## Lambda-Core

- A batteries-included AWS Lambda-based API framework, with its own request/response types and
  logger solution

## CDK (TODO)

- Automatically deploys a stack with all the required routes based on provided configuration

### Idea

- Developer only needs to export `InternalHandler`s that process an `InternalRequest` and return an `InternalResponse`
- AntStack will compile output for different AWS Lambda JavaScript runtimes

## Development with AntStack

1. Go to the specified `api-routes` directory in the `ant.config`
2. Create a new route with `ant create`.
3. Define and export `InternalHandler`s corresponding to the supported HTTP Methods for that route.

- i.e. If your route supports POST requests, make sure `export const POST: InternalHandler = ...` is present.

4. Test the route locally with `ant dev`.
   This creates an express server with the options in `ant.config` behind the scenes.
5. Build the route with `ant build`

- This builds a `dist/index.js` file with the file you worked on (`src/index.ts`).
- There is a `dist/lambda-core.js` file that contains the bundled internals of Lambda-Core.
- There are also `dist/lambda-<runtime>-runtime.js` files that contain compatible scripts for different AWS Lambda JavaScript runtimes.

# Developers: Under the Hood

## Lambda-Core

## CLI

## CDK
