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

export const isMethod = (method: string): method is keyof typeof MethodsToExpress =>
  method in MethodsToExpress;

export const isStringArray = (value: Array<unknown>): value is string[] =>
  value.every((v) => typeof v === "string");
