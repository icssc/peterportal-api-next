import { z } from "zod";

export const QuerySchema = z.object({
  q: z.string(),
  resultType: z.enum(["course", "instructor"]).optional(),
  limit: z.coerce.number().default(10),
  offset: z.coerce.number().default(0),
});

export type Query = z.infer<typeof QuerySchema>;
