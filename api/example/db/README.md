# api-route-example-db

This is an example route with support for Prisma. If your endpoint does not use Prisma, please use `api-route-example-base` instead, as the Prisma query engine substantially increases the bundle size.

To add a route like this to the project:

1. Make a copy of this folder under `/api/routes/`.
2. Modify the relevant fields in `package.json`. The `name` field in `package.json` should follow the format `api-route-<route name>`.
3. Run `npm install` and `npm install -D api-route-<route name> -w api-cdk api-dev` in the root of the project.
4. Add the new route to `/api/cdk/app.ts` and `/api/dev/router.ts` according to the instructions in the files.
5. You can now start implementing the endpoint logic in the `rawHandler`.
