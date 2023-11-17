import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

import { normalizeCourse } from "../lib";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  if (params?.id == null) {
    return res.createErrorResult(400, "Course number not provided", requestId);
  }

  if (params?.id === "all") {
    const courses = await prisma.course.findMany();
    return res.createOKResult(courses.map(normalizeCourse), headers, requestId);
  }

  try {
    return res.createOKResult(
      normalizeCourse(
        await prisma.course.findFirstOrThrow({
          where: { id: decodeURIComponent(params.id) },
        }),
      ),
      headers,
      requestId,
    );
  } catch {
    return res.createErrorResult(404, `Course ${params.id} not found`, requestId);
  }
}, onWarm);
