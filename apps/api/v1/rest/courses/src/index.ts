import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult, type InternalHandler } from "ant-stack";

import { constructPrismaQuery, normalizeCourse } from "./lib";
import { QuerySchema } from "./schema";

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { headers, params, query, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", headers, requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }

  if (params?.id) {
    if (params.id === "all") {
      const courses = await prisma.course.findMany();
      return createOKResult(courses.map(normalizeCourse), headers, requestId);
    }
    try {
      return createOKResult(
        normalizeCourse(
          await prisma.course.findFirstOrThrow({
            where: { id: decodeURIComponent(params.id) },
          }),
        ),
        headers,
        requestId,
      );
    } catch {
      return createErrorResult(404, `Course ${params.id} not found`, requestId);
    }
  } else {
    const parsedQuery = QuerySchema.parse(query);
    // The query object being empty shouldn't return all courses, since there's /courses/all for that.
    if (!Object.keys(parsedQuery).length)
      return createErrorResult(400, "Course number not provided", requestId);
    const courses = await prisma.course.findMany({ where: constructPrismaQuery(parsedQuery) });
    return createOKResult(courses.map(normalizeCourse), headers, requestId);
  }
};
