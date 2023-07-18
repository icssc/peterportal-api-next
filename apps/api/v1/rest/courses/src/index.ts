import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult, type InternalHandler } from "ant-stack";

import { normalizeCourse } from "./lib";

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { params, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }

  if (params?.id) {
    try {
      return createOKResult(
        normalizeCourse(
          await prisma.course.findFirstOrThrow({
            where: { id: decodeURIComponent(params.id) },
          }),
        ),
        requestId,
      );
    } catch {
      return createErrorResult(404, `Course ${params.id} not found`, requestId);
    }
  } else {
    // TODO implement arbitrary filtering
    return createErrorResult(400, "Course number not provided", requestId);
  }
};

export const HEAD = GET;
