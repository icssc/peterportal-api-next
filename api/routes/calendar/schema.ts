import { quarters } from "peterportal-api-next-types";
import { z } from "zod";

export const QuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/, { message: "Invalid year provided" }),
  quarter: z.enum(quarters, { invalid_type_error: "Invalid quarter provided" }),
});

export type Query = z.TypeOf<typeof QuerySchema>;
