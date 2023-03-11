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
 * Given a string of comma-separated values or an array of such strings,
 * return a sorted array containing all unique values.
 * @param val The value to normalize.
 */
const normalizeValue = (val: string | string[] | undefined): string[] =>
  Array.from(
    new Set(
      typeof val === "undefined"
        ? [""]
        : typeof val === "string"
        ? val.split(",")
        : val.map((x) => x.split(",")).flat()
    )
  ).sort();

/**
 * Given a string or combined days of the week (e.g. ``MWF``)
 * or an array of such strings, return an array containing all unique values.
 * @param val The value to normalize.
 */
const normalizeDays = (
  val: string | string[] | undefined
): string[] | undefined => {
  if (!val) return undefined;
  const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

  return Array.from(
    new Set(
      typeof val === "string"
        ? days.filter((x) => val.includes(x))
        : val.map((x) => days.filter((y) => y.includes(x))).flat()
    )
  );
};

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
      .transform(normalizeValue)
      .optional(),
    sectionCodes: z
      .string()
      .array()
      .or(z.string())
      .transform(normalizeValue)
      .optional(),
    instructorName: z.string().optional(),
    days: z.string().array().or(z.string()).transform(normalizeDays).optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    division: z.enum(anyArray).or(z.enum(divisionCodes)).optional(),
    sectionType: z.enum(anyArray).or(z.enum(sectionTypes)).optional(),
    fullCourses: z.enum(anyArray).or(z.enum(fullCoursesOptions)).optional(),
    cancelledCourses: z.enum(cancelledCoursesOptions).optional(),
    units: z
      .string()
      .array()
      .or(z.string())
      .transform(normalizeValue)
      .optional(),
    cache: z.string().optional(),
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
      x.ge ||
      x.department ||
      (x.sectionCodes ?? [""])[0].length ||
      x.instructorName,
    {
      message:
        'At least one of "ge", "department", "sectionCodes", or "instructorName" must be provided',
    }
  )
  .refine((x) => x.building || !x.room, {
    message: 'If "building" is provided, "room" must also be provided',
  });

export type Query = z.TypeOf<typeof QuerySchema>;
