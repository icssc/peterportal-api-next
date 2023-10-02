import { anyArray, divisionCodes, geCodes, quarters } from "peterportal-api-next-types";
import { z } from "zod";

export const QuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, { message: "Invalid year provided" })
    .optional(),
  quarter: z.enum(quarters, { invalid_type_error: "Invalid quarter provided" }).optional(),
  instructor: z.string().optional(),
  department: z.string().optional(),
  courseNumber: z.string().optional(),
  sectionCode: z
    .string()
    .regex(/^\d{5}$/, { message: "Invalid sectionCode provided" })
    .optional(),
  division: z.enum(anyArray).or(z.enum(divisionCodes)).optional(),
  ge: z.enum(anyArray).or(z.enum(geCodes)).optional(),
  excludePNP: z
    .string()
    .optional()
    .transform((x) => x === "true"),
});

export type Query = z.infer<typeof QuerySchema>;
