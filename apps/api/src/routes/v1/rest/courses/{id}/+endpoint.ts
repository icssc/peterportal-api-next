import { createHandler } from "@libs/lambda";
import { courses } from "virtual:courses";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const { id } = event.pathParameters ?? {};

  switch (id) {
    case null:
    case undefined:
      return res.createErrorResult(400, "Course number not provided", requestId);
    case "all":
      return res.createOKResult(Object.values(courses), headers, requestId);
    default:
      return courses[decodeURIComponent(id)]
        ? res.createOKResult(courses[decodeURIComponent(id)], headers, requestId)
        : res.createErrorResult(404, `Course ${id} not found`, requestId);
  }
});
