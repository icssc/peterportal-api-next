import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  if (params?.id == null) {
    return res.createErrorResult(400, "Instructor UCInetID not provided", requestId);
  }

  try {
    if (params.id === "all") {
      const instructors = await prisma.instructor.findMany();
      return res.createOKResult(instructors, headers, requestId);
    }

    return res.createOKResult(
      await prisma.instructor.findFirstOrThrow({
        where: { ucinetid: decodeURIComponent(params.id) },
      }),
      headers,
      requestId,
    );
  } catch {
    return res.createErrorResult(404, `Instructor ${params.id} not found`, requestId);
  }
}, onWarm);
