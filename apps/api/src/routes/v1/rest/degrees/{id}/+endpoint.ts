import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

import { ProgramSchema, SpecializationSchema } from "./schema";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const params = event.pathParameters ?? {};
  const query = event.queryStringParameters ?? {};
  const requestId = context.awsRequestId;

  switch (params?.id) {
    case "all":
      return res.createOKResult(
        await prisma.degree.findMany({
          include: { majors: { include: { specializations: true } } },
        }),
        headers,
        requestId,
      );
    case "majors":
    case "minors": {
      const maybeParsed = ProgramSchema.safeParse(query);
      if (maybeParsed.success) {
        const { data } = maybeParsed;
        console.log(data);
        // Ugly TypeScript kludge that lets this union typecheck properly when calling the find methods.
        // This is real code, written by real software engineers.
        const table =
          params.id === "majors" ? prisma.major : (prisma.minor as unknown as typeof prisma.major);
        if (!Object.keys(data).length)
          return res.createOKResult(
            await table.findMany({
              include: { specializations: params.id === "majors" ? true : undefined },
            }),
            headers,
            requestId,
          );
        if ("id" in data) {
          const row = await table.findFirst({
            where: { id: data.id },
            include: { specializations: params.id === "majors" ? true : undefined },
          });
          return row
            ? res.createOKResult(row, headers, requestId)
            : res.createErrorResult(
                404,
                `${params.id === "majors" ? "Major" : "Minor"} with ID ${data.id} not found`,
                requestId,
              );
        }
        if ("degreeId" in data || "nameContains" in data) {
          if (params.id === "minors" && data.degreeId)
            return res.createErrorResult(400, "Invalid input", requestId);
          return res.createOKResult(
            await table.findMany({
              where: {
                degreeId: data.degreeId,
                name: { contains: data.nameContains, mode: "insensitive" },
              },
              include: { specializations: params.id === "majors" ? true : undefined },
            }),
            headers,
            requestId,
          );
        }
      } else {
        return res.createErrorResult(
          400,
          maybeParsed.error.issues.map((issue) => issue.message).join("; "),
          requestId,
        );
      }
      break;
    }
    case "specializations": {
      const maybeParsed = SpecializationSchema.safeParse(query);
      if (maybeParsed.success) {
        const { data } = maybeParsed;
        if (!Object.keys(data).length)
          return res.createOKResult(await prisma.specialization.findMany(), headers, requestId);
        if ("id" in data) {
          const row = await prisma.specialization.findFirst({ where: { id: data.id } });
          return row
            ? res.createOKResult(row, headers, requestId)
            : res.createErrorResult(404, `Specialization with ID ${data.id} not found`, requestId);
        }
        if ("majorId" in data)
          return res.createOKResult(
            await prisma.specialization.findMany({ where: { majorId: data.majorId } }),
            headers,
            requestId,
          );
        if ("nameContains" in data) {
          return res.createOKResult(
            await prisma.specialization.findMany({
              where: { name: { contains: data.nameContains, mode: "insensitive" } },
            }),
            headers,
            requestId,
          );
        }
      } else {
        return res.createErrorResult(
          400,
          maybeParsed.error.issues.map((issue) => issue.message).join("; "),
          requestId,
        );
      }
    }
  }
  return res.createErrorResult(400, "Invalid endpoint", requestId);
}, onWarm);
