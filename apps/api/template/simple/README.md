# Simple Template

This is a simple example module without support for Prisma.
Use `template/advanced` for Prisma support.

## Steps of implementing and integrating a new module into the project

1. Copy a template into `/apps/api/modules/`
2. Name the new module
3. Update the file names to match chosen name
4. Write the logic for the module and make sure all of its components are connected properly

- controller: the router, i.e. API request handler for this module
- service: handles data, external API calls, database calls, etc. for the controller
- module: describes this portion of the app and its included controllers, services, etc.

5. Test the module on its own by running `yarn dev <path to index.ts from /apps/api>`

- the path is relative to the `apps/api` project
- e.g. `yarn dev template/advanced/index.ts` to test out the advanced module by itself

6. Make a PR and confirm that it is ready to merge
7. Import the new module into `apps/api/index.ts` and add it to the module array
8. Test the entire server by running `yarn dev index.ts`
