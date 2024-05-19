import { z } from "zod";

export const ProgramSchema = z
  .union([
    z.object({ id: z.string() }),
    z.object({ degreeId: z.string().optional(), nameContains: z.string().optional() }),
    z.object({}),
  ])
  .transform((data) => {
    if ("id" in data) {
      return { type: "id" as const, ...data };
    }

    if ("degreeId" in data && data.degreeId != null) {
      return { type: "degreeOrName" as const, degreeId: data.degreeId, ...data };
    }

    return { type: "empty" as const, ...data };
  });

export const SpecializationSchema = z
  .union([
    z.object({ id: z.string() }),
    z.object({ majorId: z.string() }),
    z.object({ nameContains: z.string() }),
    z.object({}),
  ])
  .transform((data) => {
    if ("id" in data) {
      return { type: "id" as const, ...data };
    }

    if ("majorId" in data) {
      return { type: "major" as const, ...data };
    }

    if ("nameContains" in data) {
      return { type: "name" as const, ...data };
    }

    return { type: "empty" as const, ...data };
  });
