import { createHandler } from "@libs/lambda";
import { instructors } from "virtual:instructors";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const { id } = event.pathParameters ?? {};

  switch (id) {
    case null:
    case undefined:
      return res.createErrorResult(400, "Instructor UCInetID not provided", requestId);
    case "all":
      return res.createOKResult(Object.values(instructors), headers, requestId);
    default:
      return instructors[decodeURIComponent(id)]
        ? res.createOKResult(instructors[decodeURIComponent(id)], headers, requestId)
        : res.createErrorResult(404, `Instructor ${id} not found`, requestId);
  }
});
