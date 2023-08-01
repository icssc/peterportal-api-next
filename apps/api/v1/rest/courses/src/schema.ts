import { divisionCodes, geCodes } from "peterportal-api-next-types";
import { z } from "zod";

export const QuerySchema = z.object({
  department: z.string().optional(),
  courseNumber: z.string().optional(),
  courseNumeric: z.number().optional(),
  titleContains: z.string().optional(),
  courseLevel: z.enum(divisionCodes).optional(),
  minUnits: z.number().optional(),
  maxUnits: z.number().optional(),
  descriptionContains: z.string().optional(),
  taughtByInstructor: z.string().optional(),
  geCategory: z.enum(geCodes).optional(),
  taughtInTerm: z.string().optional(),
});

export type Query = z.infer<typeof QuerySchema>;
