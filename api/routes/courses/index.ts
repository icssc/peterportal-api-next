import { PrismaClient } from "@libs/db";
import type { LambdaHandler, RawHandler } from "api-core";
import { createErrorResult, createLambdaHandler, createOKResult } from "api-core";

const prisma = new PrismaClient();

export const rawHandler: RawHandler = async (request) => {
  const { method, path, params, query, requestId } = request.getParams();
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
      return createOKResult({}, requestId);
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler: LambdaHandler = async (event, context) =>
  createLambdaHandler(rawHandler)(event, context);
