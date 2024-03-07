import { z } from "zod";

export const ProgramSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ degreeId: z.string().optional(), nameContains: z.string().optional() }),
  z.object({}),
]);

export const SpecializationSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ majorId: z.string() }),
  z.object({ nameContains: z.string() }),
  z.object({}),
]);
