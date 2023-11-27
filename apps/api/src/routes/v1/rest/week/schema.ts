import { z } from "zod";

// The list of 1-indexed short months, not including February.
const shortMonths = [4, 6, 9, 11];

// Checks if the given year is a leap year.
const isLeap = (x: number) => x % 4 == 0 && (x % 100 == 0 ? x % 400 == 0 : true);

export const QuerySchema = z
  .object({
    year: z.coerce.number().int().gte(1000).lte(9999).optional(),
    month: z.coerce.number().int().gte(1).lte(12).optional(),
    day: z.coerce.number().int().gte(1).lte(31).optional(),
  })
  .refine(
    ({ year, month, day }) =>
      (year === undefined && month === undefined && day === undefined) ||
      (year !== undefined && month !== undefined && day !== undefined),
    {
      message: "All fields must be either provided or left blank",
    },
  )
  .transform(({ year, month, day }) => ({
    year: year ?? 0,
    month: month ?? 0,
    day: day ?? 0,
    hasParams: year !== undefined,
  }))
  .refine(
    ({ year, month, day, hasParams }) =>
      hasParams
        ? (month === 2 ? (isLeap(year) ? day < 30 : day < 29) : true) &&
          (shortMonths.includes(month) ? day < 31 : true)
        : true,
    {
      message: "The day provided is not valid for the month provided",
    },
  );

export type Query = z.infer<typeof QuerySchema>;
