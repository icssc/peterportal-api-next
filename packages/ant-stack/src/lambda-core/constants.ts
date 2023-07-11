/**
 * UUID with all zeros. Used as `requestId` in `InternalRequest` when testing locally.
 */
export const zeroUUID = "00000000-0000-0000-0000-000000000000";

/**
 * HTTP/1.1 error status codes mapped to their RFC 2616 names.
 */
export const httpErrorCodes = {
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error",
} as const;

/**
 * Month indices mapped to three-character abbreviations for CLF date.
 */
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const httpMethods = [
  "ANY",
  "DELETE",
  "GET",
  "HEAD",
  "PATCH",
  "POST",
  "PUT",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof httpMethods)[number];

export function isHttpMethod(method: string): method is HttpMethod {
  return httpMethods.includes(method as HttpMethod);
}

/**
 * The body of a warming request to an AWS Lambda function.
 */
export const warmerRequestBody = JSON.stringify({ isWarmer: true });
