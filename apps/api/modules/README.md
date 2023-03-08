# Templates

Here are templates for adding new modules to the application.

Steps of implementing and integrating a new module into the project

1. Make a copy of the module under `/apps/api/modules`
2. Write the logic for the module, e.g. controllers, services, etc.
3. Test the module on its own by running `yarn tsx <path to index.ts for module>`
4. Import the module into `apps/api/app.module.ts` and add it to the module array
