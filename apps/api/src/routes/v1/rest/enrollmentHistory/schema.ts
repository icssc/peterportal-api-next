import { quarters, sectionTypes } from "@peterportal-api/types";
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
    .transform((x) => Number.parseInt(x, 10))
    .optional(),
  sectionType: z
    .enum(sectionTypes, { invalid_type_error: "Invalid sectionType provided" })
    .optional(),
});

export type Query = z.infer<typeof QuerySchema>;
