import { flattenStringsAndSplit } from "@libs/utils";
import { z } from "zod";

export const QuerySchema = z.object({
  nameContains: z.string().optional(),
  shortenedName: z.string().optional(),
  titleContains: z.string().optional(),
  departmentContains: z.string().optional(),
  schoolsContains: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
  relatedDepartmentsContains: z
    .string()
    .array()
    .or(z.string())
    .optional()
    .transform(flattenStringsAndSplit),
  taughtInTerms: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
});

export type Query = z.infer<typeof QuerySchema>;
