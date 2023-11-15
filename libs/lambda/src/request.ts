/**
 * The body of a warming request.
 *
 * A warming request is periodically sent to ensure that the Lambda function is active.
 * Ideally, it wouldn't trigger any expensive computations.
 */
export const warmingRequestBody = { body: "warming request" };
