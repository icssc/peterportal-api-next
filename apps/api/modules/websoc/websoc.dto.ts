import hash from "object-hash";
import type {
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";
import {
  anyArray,
  cancelledCoursesOptions,
  divisionCodes,
  fullCoursesOptions,
  geCodes,
  quarters,
  sectionTypes,
} from "peterportal-api-next-types";
import { WebsocAPIOptions } from "websoc-api-next";
import { z } from "zod";

/**
 * Given a string of comma-separated values or an array of such strings,
 * return a sorted array containing all unique values.
 * @param val The value to normalize.
 */
const normalizeValue = (val: string | string[] | undefined): string[] => {
  const unique = Array.from(
    new Set(
      Array.isArray(val)
        ? val.map((x) => x.split(",")).flat()
        : val?.split(",") || [""]
    )
  );
  return [...unique].sort();
};

/**
 * schema that parses an unknown query; transforms and statically types the output
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
    courseTitle: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    maxCapacity: z.string().optional(),
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

/**
 * type of the query is provided if the query parsing and usage aren't co-located
 */
export type Query = z.TypeOf<typeof QuerySchema>;

const query = QuerySchema.parse("");

const stringKeys: (keyof Query)[] = [
  "ge",
  "department",
  "building",
  "room",
  "division",
  "instructorName",
  "courseTitle",
  "sectionType",
  "startTime",
  "endTime",
  "maxCapacity",
  "fullCourses",
  "cancelledCourses",
];

const baseQuery: Record<string, string | string[]> = {};
for (const key of stringKeys) {
  const value = query[key];
  if (value && query[key] !== "ANY") {
    baseQuery[key] = value;
  }
}

const rizz = query.units
  .map((units) => ({ ...baseQuery, units }))
  .map((q) =>
    [...Array(Math.ceil(query.sectionCodes.length / 5)).keys()].map((x) => ({
      ...q,
      sectionCodes: query.sectionCodes.slice(x * 5, (x + 1) * 5).join(","),
    }))
  )
  .flat()
  .map(
    ({ units, sectionCodes }) =>
      ({
        ...(units && { units }),
        ...(sectionCodes && { sectionCodes }),
      } as WebsocAPIOptions)
  );

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
const lexOrder = (a: string, b: string): number =>
  a === b ? 0 : a > b ? 1 : -1;

/**
 * Given a nested section and all of its parent structures, returns a
 * ``WebsocAPIResponse`` object that contains only that section.
 * @param school The school that the department belongs to.
 * @param department The department that the course belongs to.
 * @param course The course that the section belongs to.
 * @param section The section to isolate.
 */
const isolateSection = (
  school: WebsocSchool,
  department: WebsocDepartment,
  course: WebsocCourse,
  section: WebsocSection
): WebsocAPIResponse => ({
  schools: [
    {
      ...school,
      departments: [
        {
          ...department,
          courses: [
            {
              ...course,
              sections: [section],
            },
          ],
        },
      ],
    },
  ],
});

/**
 * preserves context for each section
 */
interface EnhancedSection {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
}

/**
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
const combineResponses = (
  responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  /**
   * all sections are enhanced with contextual info from parent structures
   */
  const allSections: EnhancedSection[] = responses
    .map((response) =>
      response.schools
        .map((school) =>
          school.departments
            .map((department) =>
              department.courses
                .map((course) =>
                  course.sections
                    .map((section) => ({
                      school,
                      department,
                      course,
                      section,
                    }))
                    .flat()
                )
                .flat()
            )
            .flat()
        )
        .flat()
    )
    .flat();

  /**
   * for each section:
   * if one of its parent structures hasn't been declared,
   * append that structure appropriately
   */
  const schools = allSections.reduce((acc, section) => {
    const foundSchool = acc.find(
      (s) => s.schoolName === section.school.schoolName
    );
    if (!foundSchool) {
      acc.push(section.school);
      return acc;
    }

    const foundDept = foundSchool.departments.find(
      (d) => d.deptCode === section.department.deptCode
    );
    if (!foundDept) {
      foundSchool.departments.push(section.department);
      return acc;
    }

    const foundCourse = foundDept.courses.find(
      (c) =>
        c.courseNumber === section.course.courseNumber &&
        c.courseTitle === section.course.courseTitle
    );
    if (!foundCourse) {
      foundDept.courses.push(section.course);
      return acc;
    }

    const foundSection = foundCourse.sections.find(
      (s) => s.sectionCode === section.section.sectionCode
    );
    if (!foundSection) {
      foundCourse.sections.push(section.section);
      return acc;
    }

    return acc;
  }, [] as WebsocSchool[]);

  /**
   * all sections have been located properly in the combined structure,
   * calculate the meetings for each section
   */
  schools.forEach((s) => {
    s.departments.forEach((d) => {
      d.courses.forEach((c) => {
        c.sections.forEach((e) => {
          const meetingsHashSet: Record<string, WebsocSectionMeeting> = {};
          for (const meeting of e.meetings) {
            const meetingHash = hash([meeting.days, meeting.time]);
            if (meetingHash in meetingsHashSet) {
              meetingsHashSet[meetingHash].bldg.push(meeting.bldg[0]);
            } else {
              meetingsHashSet[meetingHash] = { ...meeting };
            }
            e.meetings = Object.values(meetingsHashSet);
          }
        });
      });
    });
  });

  return { schools };
};
