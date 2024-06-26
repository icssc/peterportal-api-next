import {
  anyArray,
  cancelledCoursesOptions,
  divisionCodes,
  fullCoursesOptions,
  geCodes,
  quarters,
  sectionTypes,
} from "@anteater-api/types";
import { $Enums } from "@libs/db";
import { z } from "zod";

import { flattenDayStringsAndSplit, flattenStringsAndSplit } from "../../../../lib/utils";

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
    cache: z
      .string()
      .optional()
      .transform((x) => !(x === "false")),
    cacheOnly: z
      .string()
      .optional()
      .transform((x) => x === "true"),
    includeCoCourses: z
      .string()
      .optional()
      .transform((x) => x === "true"),
    ge: z.enum(anyArray).or(z.enum(geCodes)).optional(),
    department: z.string().optional(),
    courseTitle: z.string().optional(),
    courseNumber: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
    sectionCodes: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
    instructorName: z.string().optional(),
    days: z.string().array().or(z.string()).optional().transform(flattenDayStringsAndSplit),
    building: z.string().optional(),
    room: z.string().optional(),
    division: z.union([z.enum(anyArray), z.enum(divisionCodes)]).optional(),
    sectionType: z.union([z.enum(anyArray), z.enum(sectionTypes)]).optional(),
    fullCourses: z.union([z.enum(anyArray), z.enum(fullCoursesOptions)]).optional(),
    cancelledCourses: z.enum(cancelledCoursesOptions).optional(),
    units: z.string().array().or(z.string()).optional().transform(flattenStringsAndSplit),
    startTime: z.optional(z.literal("").or(z.string().regex(/([1-9]|1[0-2]):[0-5][0-9][ap]m/))),
    endTime: z.optional(z.literal("").or(z.string().regex(/([1-9]|1[0-2]):[0-5][0-9][ap]m/))),
    excludeRestrictionCodes: z
      .string()
      .array()
      .or(z.string())
      .optional()
      .transform(flattenStringsAndSplit),
  })
  .refine((x) => x.cache || !x.cacheOnly, {
    message: "cacheOnly cannot be true if cache is false",
  })
  .refine((x) => x.cacheOnly || !x.includeCoCourses, {
    message: "includeCoCourses cannot be true if cacheOnly is false",
  })
  .refine(
    (x) => x.cacheOnly || x.ge || x.department || x.sectionCodes?.[0].length || x.instructorName,
    {
      message:
        'At least one of "ge", "department", "sectionCodes", or "instructorName" must be provided',
    },
  )
  .refine((x) => x.cacheOnly || x.building || !x.room, {
    message: 'If "building" is provided, "room" must also be provided',
  })
  .refine(
    (x) => {
      // If not excluding restriction codes, then no more validation is needed.
      if (x.excludeRestrictionCodes == null) return true;

      // Ensure that all provided restriction codes are valid.
      return x.excludeRestrictionCodes.every((code) =>
        Object.values($Enums.RestrictionCode).includes(code as $Enums.RestrictionCode),
      );
    },
    {
      message: `Restriction codes must be in [${Object.values($Enums.RestrictionCode).join(", ")}]`,
    },
  );

/**
 * Type of the parsed query: useful for passing the query as input to other functions.
 */
export type Query = z.infer<typeof QuerySchema>;
