import uFuzzy from "@leeoniya/ufuzzy";
import { createHandler } from "@libs/lambda";
import type { Course, Instructor } from "@peterportal-api/types";
import { courses } from "virtual:courses";
import { instructors } from "virtual:instructors";
import { haystack, mapping } from "virtual:search";

import { QuerySchema } from "./schema";

const u = new uFuzzy({ intraMode: 1 /* IntraMode.SingleError */ });

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const query = event.queryStringParameters ?? {};

  const maybeParsed = QuerySchema.safeParse(query);
  if (maybeParsed.success) {
    const { data } = maybeParsed;
    const keys = Array.from(new Set(u.search(haystack, data.q)[0]?.map((x) => mapping[x])));
    const results: Array<Course | Instructor> = keys
      .slice(data.offset, data.offset + data.limit)
      .map((x) => courses[x] ?? instructors[x]);
    return res.createOKResult(
      {
        count: keys.length,
        results: results.filter((x) =>
          !data.resultType ? x : data.resultType === "course" ? "id" in x : "ucinetid" in x,
        ),
      },
      headers,
      requestId,
    );
  }
  return res.createErrorResult(400, "Search query not provided", requestId);
});
