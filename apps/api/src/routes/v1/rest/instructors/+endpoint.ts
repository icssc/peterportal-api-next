import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import { instructors } from "INSTRUCTORS";
import { ZodError } from "zod";

import { constructPrismaQuery } from "./lib";
import { QuerySchema } from "./schema";

console.log({ instructors });

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const query = event.queryStringParameters;
  const requestId = context.awsRequestId;

  try {
    const parsedQuery = QuerySchema.parse(query);
    // The query object being empty shouldn't return all courses, since there's /courses/all for that.
    if (!Object.keys(parsedQuery).length)
      return res.createErrorResult(400, "Instructor UCInetID not provided", requestId);
    const instructors = await prisma.instructor.findMany({
      where: constructPrismaQuery(parsedQuery),
    });
    if (parsedQuery.taughtInTerms) {
      const terms = new Set(parsedQuery.taughtInTerms);
      return res.createOKResult(
        instructors.filter(
          (instructor) =>
            [...new Set(Object.values(instructor.courseHistory as Record<string, string[]>))]
              .flat()
              .filter((x) => terms.has(x)).length,
        ),
        headers,
        requestId,
      );
    }
    return res.createOKResult(instructors, headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, error, requestId);
  }
}, onWarm);
