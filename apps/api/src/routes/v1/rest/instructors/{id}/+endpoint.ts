import { createHandler } from "@libs/lambda";
import { instructors } from "virtual:instructors";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  if (params?.id == null) {
    return res.createErrorResult(400, "Instructor UCInetID not provided", requestId);
  }
  if (params.id === "all") {
    return res.createOKResult(instructors, headers, requestId);
  }
  if (instructors[decodeURIComponent(params.id)]) {
    return res.createOKResult(instructors[decodeURIComponent(params.id)], headers, requestId);
  }
  return res.createErrorResult(404, `Instructor ${params.id} not found`, requestId);
});
