import { z } from "zod";

export const QuerySchema = z.object({
  query: z.string(),
  resultType: z.enum(["course", "instructor"]).optional(),
  limit: z.coerce.number().int().default(10),
  offset: z.coerce.number().int().default(0),
});

export type Query = z.infer<typeof QuerySchema>;
