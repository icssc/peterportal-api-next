import { Course as PrismaCourse } from "@libs/db";
import {
  Course,
  CourseLevel,
  CoursePreview,
  GECategory,
  InstructorPreview,
  PrerequisiteTree,
} from "@peterportal-api/types";

const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

const courseLevels: Record<string, CourseLevel> = {
  LowerDiv: "Lower Division (1-99)",
  UpperDiv: "Upper Division (100-199)",
  Graduate: "Graduate/Professional Only (200+)",
};

const geMapping: Record<string, GECategory> = {
  "GE-1A": "GE Ia: Lower Division Writing",
  "GE-1B": "GE Ib: Upper Division Writing",
  "GE-2": "GE II: Science and Technology",
  "GE-3": "GE III: Social & Behavioral Sciences",
  "GE-4": "GE IV: Arts and Humanities",
  "GE-5A": "GE Va: Quantitative Literacy",
  "GE-5B": "GE Vb: Formal Reasoning",
  "GE-6": "GE VI: Language Other Than English",
  "GE-7": "GE VII: Multicultural Studies",
  "GE-8": "GE VIII: International/Global Issues",
};

/**
 * Input to a transform function.
 */
export type TransformInput = string | string[] | undefined;

/**
 * Output of a transform function.
 */
export type TransformOutput = string[] | undefined;

/**
 * Get unique, sorted array of strings.
 * @param value String of comma-separated values or array of such strings.
 */
export const flattenStringsAndSplit = (value: TransformInput): TransformOutput =>
  value
    ? Array.from(
        new Set(Array.isArray(value) ? value.flatMap((x) => x.split(",")) : value.split(",")),
      ).sort()
    : undefined;

/**
 * Get unique, sorted array of day strings from input.
 * @param value String of combined days of the week (e.g. ``MWF``) or array of such strings.
 */
export const flattenDayStringsAndSplit = (value: TransformInput): TransformOutput =>
  value
    ? Array.from(
        new Set(
          Array.isArray(value)
            ? value.flatMap((x) => days.filter((y) => y.includes(x)))
            : days.filter((x) => value.includes(x)),
        ),
      )
    : undefined;

export function normalizeCourse(course: PrismaCourse): Course {
  const courseLevel = courseLevels[course.courseLevel];
  const geList = (course.geList as string[]).map((x) => geMapping[x]);
  return {
    ...course,
    courseLevel,
    instructorHistory: course.instructorHistory,
    instructors: course.instructors as unknown as InstructorPreview[],
    prerequisiteTree: course.prerequisiteTree as unknown as PrerequisiteTree,
    prerequisiteList: course.prerequisiteList,
    prerequisiteFor: course.prerequisiteFor,
    prerequisites: course.prerequisites as unknown as CoursePreview[],
    dependencies: course.dependencies as unknown as CoursePreview[],
    geList,
    terms: course.terms,
  };
}
