import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "ant-stack";
import type { InternalHandler } from "ant-stack";
import { ZodError } from "zod";

import { constructPrismaQuery } from "./lib";
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
    try {
      if (params.id === "all") {
        const instructors = await prisma.instructor.findMany();
        return createOKResult(instructors, headers, requestId);
      }
      return createOKResult(
        await prisma.instructor.findFirstOrThrow({
          where: { ucinetid: decodeURIComponent(params.id) },
        }),
        headers,
        requestId,
      );
    } catch {
      return createErrorResult(404, `Instructor ${params.id} not found`, requestId);
    }
  } else {
    try {
      const parsedQuery = QuerySchema.parse(query);
      // The query object being empty shouldn't return all courses, since there's /courses/all for that.
      if (!Object.keys(parsedQuery).length)
        return createErrorResult(400, "Instructor UCInetID not provided", requestId);
      const instructors = await prisma.instructor.findMany({
        where: constructPrismaQuery(parsedQuery),
      });
      if (parsedQuery.taughtInTerms) {
        const terms = new Set(parsedQuery.taughtInTerms);
        return createOKResult(
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
      return createOKResult(instructors, headers, requestId);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message);
        return createErrorResult(400, messages.join("; "), requestId);
      }
      return createErrorResult(400, error, requestId);
    }
  }
};
