import { z } from "zod";

// The list of 1-indexed short months, not including February.
const shortMonths = [4, 6, 9, 11];

// Checks if the given year is a leap year.
const isLeap = (x: number) => x % 4 == 0 && (x % 100 == 0 ? x % 400 == 0 : true);

export const QuerySchema = z
  .object({
    year: z.coerce.number().int().gte(1000).lte(9999),
    month: z.coerce.number().int().gte(1).lte(12),
    day: z.coerce.number().int().gte(1).lte(31),
  })
  .refine(
    (x) =>
      (x.month === 2 ? (isLeap(x.year) ? x.day < 30 : x.day < 29) : true) &&
      (shortMonths.includes(x.month) ? x.day < 31 : true),
    {
      message: "The day provided is not valid for the month provided",
    },
  )
  .transform((params) => ({
    hasParams: true,
    ...params,
  }))
  .or(z.null().transform(() => ({ year: -1, month: -1, day: -1, hasParams: false })));

export type Query = z.infer<typeof QuerySchema>;
