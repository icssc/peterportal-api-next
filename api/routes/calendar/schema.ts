import { quarters } from "peterportal-api-next-types";
import { z } from "zod";

export const QuerySchema = z.object({
  year: z
    .string({ required_error: 'Parameter "year" not provided' })
    .regex(/^\d{4}$/, { message: "Invalid year provided" }),
  quarter: z.enum(quarters, {
    required_error: 'Parameter "quarter" not provided',
    invalid_type_error: "Invalid quarter provided",
  }),
});

export type Query = z.TypeOf<typeof QuerySchema>;
