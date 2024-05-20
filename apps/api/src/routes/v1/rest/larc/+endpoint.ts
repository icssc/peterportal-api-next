import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import { ZodError } from "zod";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const query = event.queryStringParameters;

  try {
    const { year, quarter } = QuerySchema.parse(query);

    return res.createOKResult(
      (await prisma.larcTerm.findFirst({ where: { year, quarter } }))?.courses ?? [],
      headers,
      requestId,
    );
  } catch (e) {
    if (e instanceof ZodError) {
      const messages = e.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }

    return res.createErrorResult(400, e, requestId);
  }
});
