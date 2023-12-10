// These are the type declarations for the virtual modules
// used by the `/courses/{id}` and `/instructors/{id}` routes.
// The reason we have to use inline imports here is because with `import` statements, TypeScript
// treats this as a normal module rather than an ambient module, and so the module declarations
// don't actually work when consumed by other TypeScript source files.

declare module "virtual:courses" {
  declare const courses: Record<string, import("@peterportal-api/types").Course>;
}

declare module "virtual:instructors" {
  declare const instructors: Record<string, import("@peterportal-api/types").Instructor>;
}
