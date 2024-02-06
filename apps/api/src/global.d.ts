/**
 * Ambient declaration file for defining "virtual" modules/files.
 * The file contents are generated dynamically during build time by esbuild.
 * DO NOT add any imports/exports; that converts the file to a regular module
 * and removes the global declarations.
 */

/**
 * Virtual module for caching course information during build time.
 */
declare module "virtual:courses" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  declare const courses: Record<string, import("@peterportal-api/types").Course>;
}
/**
 * Virtual module for caching instructor information during build time.
 */
declare module "virtual:instructors" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  declare const instructors: Record<string, import("@peterportal-api/types").Instructor>;
}
