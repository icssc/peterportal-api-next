import { z } from "zod";

// The list of short months, not including February.
const shortMonths = [4, 6, 9, 11];

// Checks if the given year is a leap year.
const isLeap = (x: number) => x % 4 == 0 && (x % 100 == 0 ? x % 400 == 0 : true);

export const QuerySchema = z
  .object({
    year: z.coerce.number().int().gte(1000).lte(9999),
    month: z.coerce.number().int().gte(1).lte(12),
    day: z.coerce.number().int().gte(1).lte(31),
  })
  .refine((x) => (x.month === 2 && x.day === 29 ? isLeap(x.year) : true), {
    message: "The year provided is not a leap year",
  })
  .refine((x) => (shortMonths.includes(x.month) ? x.day < 31 : true), {
    message: "The day provided is not valid for the month provided",
  })
  .or(
    z.object({
      year: z.undefined(),
      month: z.undefined(),
      day: z.undefined(),
    }),
  );

z.setErrorMap((issue, ctx) => ({
  message:
    issue.code === z.ZodIssueCode.invalid_union
      ? "All fields must either be provided or left blank"
      : ctx.defaultError,
}));

export type Query = z.TypeOf<typeof QuerySchema>;
