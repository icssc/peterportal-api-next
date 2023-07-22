import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "ant-stack";
import type { InternalHandler } from "ant-stack";

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
        await prisma.instructor.findFirstOrThrow({
          where: { ucinetid: decodeURIComponent(params.id) },
        }),
        requestId,
      );
    } catch {
      return createErrorResult(404, `Instructor ${params.id} not found`, requestId);
    }
  } else {
    // TODO implement arbitrary filtering
    const instructors = await prisma.instructor.findMany();
    return createOKResult(instructors, requestId);
  }
};
