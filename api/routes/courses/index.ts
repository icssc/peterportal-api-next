import { PrismaClient } from "@libs/db";
import type { LambdaHandler, RawHandler } from "api-core";
import { createErrorResult, createLambdaHandler, createOKResult } from "api-core";
import { Course } from "peterportal-api-next-types";

import { normalizeCourse } from "./lib";

const prisma = new PrismaClient();

export const rawHandler: RawHandler = async (request) => {
  const { method, path, params, requestId } = request.getParams();
  if (request.isWarmerRequest()) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (e) {
      createErrorResult(500, e, requestId);
    }
  }
  switch (method) {
    case "HEAD":
    case "GET":
      if (params?.id) {
        try {
          return createOKResult<Course>(
            normalizeCourse(
              await prisma.course.findUniqueOrThrow({
                where: { id: params.id },
              })
            ),
            requestId
          );
        } catch {
          return createErrorResult(404, `Course ${params.id} not found`, requestId);
        }
      } else {
        // TODO implement arbitrary filtering
        return createErrorResult(400, "Course number not provided", requestId);
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler: LambdaHandler = async (event, context) =>
  createLambdaHandler(rawHandler)(event, context);
