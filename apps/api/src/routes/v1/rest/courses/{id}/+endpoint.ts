import { createHandler } from "@libs/lambda";
import { courses } from "virtual:courses";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  if (params?.id == null) {
    return res.createErrorResult(400, "Course number not provided", requestId);
  }
  if (params?.id === "all") {
    return res.createOKResult(courses, headers, requestId);
  }
  if (courses[decodeURIComponent(params.id)]) {
    return res.createOKResult(courses[decodeURIComponent(params.id)], headers, requestId);
  }
  return res.createErrorResult(404, `Course ${params.id} not found`, requestId);
});
