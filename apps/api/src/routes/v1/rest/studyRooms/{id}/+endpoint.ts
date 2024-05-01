import { createHandler } from "@libs/lambda";
import { studyLocations } from "libs/uc-irvine-lib/src/spaces";
import { ZodError } from "zod";

import { aggreagteStudyRooms } from "../lib";

import { Query, QuerySchema } from "./schema";

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;
  const { id } = event.pathParameters ?? {};
  let parsedQuery: Query;
  try {
    switch (id) {
      case null:
      case undefined:
        return res.createErrorResult(400, "Location not provided", requestId);
      case "all":
        parsedQuery = QuerySchema.parse(query);
        return res.createOKResult(
          await Promise.all(
            Object.keys(studyLocations).map(async (locationId) => {
              return aggreagteStudyRooms(locationId, parsedQuery.start, parsedQuery.end);
            }),
          ),
          headers,
          requestId,
        );
      default:
        return res.createErrorResult(400, "Invalid endpoint", requestId);
    }
  } catch (e) {
    if (e instanceof ZodError) {
      const messages = e.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, e, requestId);
  }
});
