import { createHandler } from "@libs/lambda";
import { studyLocations } from "libs/uc-irvine-lib/src/spaces";
import { ZodError } from "zod";

import { aggreagteStudyRooms } from "./lib";
import { Query, QuerySchema } from "./schema";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;
  let parsedQuery: Query;
  try {
    parsedQuery = QuerySchema.parse(query);
    if (!studyLocations[parsedQuery.location]) {
      return res.createErrorResult(404, `Location ${parsedQuery.location} not found`, requestId);
    }
    return res.createOKResult(
      await aggreagteStudyRooms(parsedQuery.location, parsedQuery.start, parsedQuery.end),
      headers,
      requestId,
    );
  } catch (e) {
    if (e instanceof ZodError) {
      const messages = e.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, e, requestId);
  }
});
