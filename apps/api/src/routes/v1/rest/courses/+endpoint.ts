import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import { ZodError } from "zod";

import { constructPrismaQuery, normalizeCourse } from "./lib";
import { QuerySchema } from "./schema";

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
    if (!Object.keys(parsedQuery).length) {
      return res.createErrorResult(400, "Course number not provided", requestId);
    }

    const courses = await prisma.course.findMany({ where: constructPrismaQuery(parsedQuery) });

    return res.createOKResult(courses.map(normalizeCourse), headers, requestId);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, error, requestId);
  }
}, onWarm);
