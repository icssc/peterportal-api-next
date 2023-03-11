import { createZodDto } from "@anatine/zod-nestjs";
import { extendApi } from "@anatine/zod-openapi";
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
 * Input to a normalizer function.
 */
type NormalizeInput = string | string[] | undefined;

/**
 * Get unique, sorted array of strings.
 * @param value String of comma-separated values or array of such strings.
 */
function normalizeValue(value: NormalizeInput): string[] {
  const unique = new Set(
    Array.isArray(value)
      ? value.flatMap((x) => x.split(","))
      : value?.split(",")
  );
  return [...unique].sort();
}

const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

/**
 * Get unique, sorted array of day strings from input.
 * @param value String of combined days of the week (e.g. ``MWF``) or array of such strings.
 */
function normalizeDays(value: NormalizeInput): string[] | undefined {
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
export const WebsocQuerySchema = z
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
      .transform(normalizeValue),
    sectionCodes: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(normalizeValue),
    instructorName: z.string().optional(),
    days: z.string().array().or(z.string()).optional().transform(normalizeDays),
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
    cache: z.string().transform((x) => !x || x !== "false"),
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

/**
 * extended schema with OpenAPI documentation
 */
export const ExtendedWebsocQuerySchema = extendApi(WebsocQuerySchema, {
  title: "Websoc Query",
  description: "Schedule of Classes from UCI",
});

/**
 * DTO for the websoc controller
 */
export class WebsocQueryDto extends createZodDto(ExtendedWebsocQuerySchema) {}
