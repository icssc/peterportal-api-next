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
    courseNumber: z
      .string()
      .optional()
      .transform(normalizeValue)
      .transform((x) => x.join(",")),
    sectionCodes: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(normalizeValue),
    instructorName: z.string().optional(),
    days: z
      .string()
      .optional()
      .transform(normalizeValue)
      .transform((x) => x.join(",")),
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
      .optional()
      .transform(normalizeValue),
    cache: z.string().array().or(z.string()).optional(),
  })
  .refine(
    (x) => x.ge || x.department || x.sectionCodes[0].length || x.instructorName,
    {
      message:
        'At least one of "ge", "department", "sectionCodes", or "instructorName" must be provided',
    }
  )
  .refine((x) => x.building || !x.room, {
    message: 'If "building" is provided, "room" must also be provided',
  });

export type Query = z.TypeOf<typeof QuerySchema>;
