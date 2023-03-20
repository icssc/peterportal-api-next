import {
  anyArray,
  cancelledCoursesOptions,
  divisionCodes,
  fullCoursesOptions,
  geCodes,
  quarters,
  sectionTypes,
} from "peterportal-api-next-types";
import { z } from "zod";

/**
 * Input to a transform function.
 */
type TransformInput = string | string[] | undefined;

/**
 * Get unique, sorted array of strings.
 * @param value String of comma-separated values or array of such strings.
 */
function flattenStringsAndSplit(value: TransformInput): string[] | undefined {
  if (!value) return undefined;
  const unique = new Set(
    Array.isArray(value) ? value.flatMap((x) => x.split(",")) : value.split(",")
  );
  return [...unique].sort();
}

const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

/**
 * Get unique, sorted array of day strings from input.
 * @param value String of combined days of the week (e.g. ``MWF``) or array of such strings.
 */
function flattenDayStringsAndSplit(
  value: TransformInput
): string[] | undefined {
  if (!value) return undefined;
  const unique = new Set(
    Array.isArray(value)
      ? value.flatMap((x) => days.filter((y) => y.includes(x)))
      : days.filter((x) => value.includes(x))
  );
  return [...unique].sort();
}

/**
 * Parse an unknown query to the websoc endpoint.
 */
export const QuerySchema = z
  .object({
    year: z
      .string({ required_error: 'Parameter "year" not provided' })
      .length(4, { message: "Invalid year provided" }),
    quarter: z.enum(quarters, {
      required_error: 'Parameter "quarter" not provided',
      invalid_type_error: "Invalid quarter provided",
    }),
    ge: z.enum(anyArray).or(z.enum(geCodes)).optional(),
    department: z.string().optional(),
    courseTitle: z.string().optional(),
    courseNumber: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(flattenStringsAndSplit),
    sectionCodes: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(flattenStringsAndSplit),
    instructorName: z.string().optional(),
    days: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(flattenDayStringsAndSplit)
      .optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    division: z.union([z.enum(anyArray), z.enum(divisionCodes)]).optional(),
    sectionType: z.union([z.enum(anyArray), z.enum(sectionTypes)]).optional(),
    fullCourses: z
      .union([z.enum(anyArray), z.enum(fullCoursesOptions)])
      .optional(),
    cancelledCourses: z.enum(cancelledCoursesOptions).optional(),
    units: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(flattenStringsAndSplit)
      .optional(),
    cache: z
      .string()
      .optional()
      .transform((x) => !(x === "false"))
      .optional(),
    startTime: z
      .string()
      .regex(/([1-9]|1[0-2]):[0-5][0-9][ap]m/)
      .optional(),
    endTime: z
      .string()
      .regex(/([1-9]|1[0-2]):[0-5][0-9][ap]m/)
      .optional(),
  })
  .refine(
    (x) =>
      x.ge || x.department || x.sectionCodes?.[0].length || x.instructorName,
    {
      message:
        'At least one of "ge", "department", "sectionCodes", or "instructorName" must be provided',
    }
  )
  .refine((x) => x.building || !x.room, {
    message: 'If "building" is provided, "room" must also be provided',
  });

/**
 * Type of the parsed query: useful for passing the query as input to other functions.
 */
export type Query = z.TypeOf<typeof QuerySchema>;
