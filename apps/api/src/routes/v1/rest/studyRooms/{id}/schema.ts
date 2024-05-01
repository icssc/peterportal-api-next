import { z } from "zod";

export const QuerySchema = z.object({
  start: z
    .string({ required_error: 'Parameter "start" not provided' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be in YYYY-MM-DD format" }),
  end: z
    .string({ required_error: 'Parameter "end" not provided' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be in YYYY-MM-DD format" }),
});

export type Query = z.infer<typeof QuerySchema>;
