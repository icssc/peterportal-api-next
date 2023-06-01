# PeterPortal API SST (Serverless Stack)

Custom serverless, AWS framework for PeterPortal API.

## CLI

- Helps manage a PPA-SST project.

## Lambda-Core

- Core functionality of PeterPortal API on AWS Lambda

## CDK (TODO)

- Automatically deploys a stack with all the required routes based on provided configuration

### Idea

- Developer only needs to export `InternalHandler`s that process an `InternalRequest` and return an `InternalResponse`
- PPA-SST will compile output for different AWS Lambda JavaScript runtimes

## Development with PPA-SST

1. Go to the specified `api-routes` directory in the `ppa.config`
2. Create a new route with `ppa create`.
3. Define and export `InternalHandler`s corresponding to the supported HTTP Methods for that route.

- i.e. If your route supports POST requests, make sure `export const POST: InternalHandler = ...` is present.

4. Test the route locally with `ppa dev`.
   This creates an express server with the options in `ppa.config` behind the scenes.
5. Build the route with `ppa build`

- This builds a `dist/index.js` file with the file you worked on (`src/index.ts`).
- There is a `dist/lambda-core.js` file that contains the bundled internals of Lambda-Core.
- There are also `dist/lambda-<runtime>-runtime.js` files that contain compatible scripts for different AWS Lambda JavaScript runtimes.
