/**
 * Translates the HTTP verbs for API Gateway into ExpressJS methods.
 */
export const MethodsToExpress = {
  DELETE: "delete",
  GET: "get",
  HEAD: "head",
  PATCH: "patch",
  POST: "post",
  PUT: "put",
  OPTIONS: "options",
  ANY: "use",
} as const;

export type Method = keyof typeof MethodsToExpress;

export function isMethod(method: string): method is keyof typeof MethodsToExpress {
  return method in MethodsToExpress;
}
