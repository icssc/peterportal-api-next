import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";

import { ProgramSchema, SpecializationSchema } from "./schema";

const prisma = new PrismaClient();

async function onWarm() {
  await prisma.$connect();
}

const degreeRepository = {
  majors: {
    findMany: async () => {
      return await prisma.major.findMany({ include: { specializations: true } });
    },
    findFirstById: async (id: string) => {
      return await prisma.major.findFirst({ where: { id }, include: { specializations: true } });
    },
    findManyNameContains: async (degreeId: string, contains?: string) => {
      return await prisma.major.findMany({
        where: {
          degreeId,
          name: { contains, mode: "insensitive" },
        },
        include: { specializations: true },
      });
    },
  },
  minors: {
    findMany: async () => {
      return await prisma.minor.findMany({});
    },
    findFirstById: async (id: string) => {
      return await prisma.minor.findFirst({ where: { id } });
    },
  },
};

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

    case "majors": // falls through
    case "minors": {
      const parsedQuery = ProgramSchema.safeParse(query);

      if (!parsedQuery.success) {
        return res.createErrorResult(
          400,
          parsedQuery.error.issues.map((issue) => issue.message).join("; "),
          requestId,
        );
      }

      switch (parsedQuery.data.type) {
        case "id": {
          const result = await degreeRepository[params.id].findFirstById(parsedQuery.data.id);
          return result
            ? res.createOKResult(result, headers, requestId)
            : res.createErrorResult(
                404,
                `${params.id === "majors" ? "Major" : "Minor"} with ID ${parsedQuery.data.id} not found`,
                requestId,
              );
        }

        case "degreeOrName": {
          const { degreeId, nameContains } = parsedQuery.data;

          if (params.id === "minors" && degreeId != null) {
            return res.createErrorResult(400, "Invalid input", requestId);
          }

          const result = await degreeRepository.majors.findManyNameContains(degreeId, nameContains);
          return res.createOKResult(result, headers, requestId);
        }

        case "empty": {
          const result = await degreeRepository[params.id].findMany();
          return res.createOKResult(result, headers, requestId);
        }
      }
      break;
    }

    case "specializations": {
      const parsedQuery = SpecializationSchema.safeParse(query);

      if (!parsedQuery.success) {
        return res.createErrorResult(
          400,
          parsedQuery.error.issues.map((issue) => issue.message).join("; "),
          requestId,
        );
      }

      switch (parsedQuery.data.type) {
        case "id": {
          const row = await prisma.specialization.findFirst({ where: { id: parsedQuery.data.id } });

          return row
            ? res.createOKResult(row, headers, requestId)
            : res.createErrorResult(
                404,
                `Specialization with ID ${parsedQuery.data.id} not found`,
                requestId,
              );
        }

        case "major": {
          const result = await prisma.specialization.findMany({
            where: { majorId: parsedQuery.data.majorId },
          });
          return res.createOKResult(result, headers, requestId);
        }

        case "name": {
          const result = await prisma.specialization.findMany({
            where: { name: { contains: parsedQuery.data.nameContains, mode: "insensitive" } },
          });
          return res.createOKResult(result, headers, requestId);
        }

        case "empty": {
          const result = await prisma.specialization.findMany();
          return res.createOKResult(result, headers, requestId);
        }
      }
    }
  }

  return res.createErrorResult(400, "Invalid endpoint", requestId);
}, onWarm);
