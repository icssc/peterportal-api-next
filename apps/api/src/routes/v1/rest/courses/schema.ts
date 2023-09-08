import { anyArray, divisionCodes, geCodes } from "@peterportal-api/types";
import { z } from "zod";

import { flattenStringsAndSplit } from "../../../../lib/utils";

export const QuerySchema = z.object({
  department: z.string().optional(),
  courseNumber: z.string().optional(),
  courseNumeric: z.coerce.number().int().optional(),
  titleContains: z.string().optional(),
  courseLevel: z.enum(anyArray).or(z.enum(divisionCodes)).optional(),
  minUnits: z.coerce.number().optional(),
  maxUnits: z.coerce.number().optional(),
  descriptionContains: z.string().optional(),
  taughtByInstructors: z
    .string()
    .array()
    .or(z.string())
    .optional()
    .transform(flattenStringsAndSplit),
  geCategory: z.enum(anyArray).or(z.enum(geCodes)).optional(),
  taughtInTerms: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
});

export type Query = z.infer<typeof QuerySchema>;
