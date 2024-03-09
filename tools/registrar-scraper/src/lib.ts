import type { Prisma } from "@libs/db";
import type { Instructor, Prerequisite, PrerequisiteTree } from "@peterportal-api/types";
import { courseLevels, divisionCodes } from "@peterportal-api/types";

export type ScrapedCourse = {
  department: string;
  number: string;
  school: string;
  title: string;
  course_level: string;
  units: [number, number];
  description: string;
  department_name: string;
  professor_history: string[];
  prerequisite_tree: string;
  prerequisite_list: string[];
  prerequisite_text: string;
  prerequisite_for: string[];
  repeatability: string;
  grading_option: string;
  concurrent: string;
  same_as: string;
  restriction: string;
  overlap: string;
  corequisite: string;
  ge_list: string[];
  ge_text: string;
  terms: string[];
};

const termMapping: Record<string, string> = {
  F: "Fall",
  W: "Winter",
  S: "Spring",
  Y: "Summer1",
  M: "Summer10wk",
  Z: "Summer2",
};

const isPrereq = (obj: Prerequisite | PrerequisiteTree): obj is Prerequisite => "prereqType" in obj;

const prereqToString = (prereq: Prerequisite) => {
  switch (prereq.prereqType) {
    case "course":
      return prereq.courseId ?? "";
    case "exam":
      return prereq.examName ?? "";
  }
};

const prereqTreeToString = (tree: PrerequisiteTree): string => {
  if (tree.AND) {
    return `(${tree.AND.map((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToString(x))).join(
      " AND ",
    )})`;
  }
  if (tree.OR) {
    return `(${tree.OR.map((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToString(x))).join(
      " OR ",
    )})`;
  }
  if (tree.NOT) {
    return `(${tree.NOT.map((x) =>
      isPrereq(x) ? `NOT ${prereqToString(x)}` : `NOT ${prereqTreeToString(x)}`,
    ).join(" AND ")})`;
  }
  return "";
};

export const transformTerm = (term: string) => {
  const year = parseInt(term.slice(1), 10);
  /*
   * UCI's instructor history goes back to 1965, presumably because it was founded in 1965.
   * When this breaks then it probably means it's also broken, or they've changed their term format.
   * Either way, not my problem at the moment.
   */
  return termMapping[term[0]] ? `${(year >= 65 ? 1900 : 2000) + year} ${termMapping[term[0]]}` : "";
};

export const sortTerms = (a: string, b: string) => {
  const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];
  if (a.substring(0, 4) > b.substring(0, 4)) return -1;
  if (a.substring(0, 4) < b.substring(0, 4)) return 1;
  return quarterOrder.indexOf(b.substring(5)) - quarterOrder.indexOf(a.substring(5));
};

export const prereqTreeToList = (tree: PrerequisiteTree): string[] => {
  if (tree.AND) {
    return tree.AND.flatMap((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToList(x)));
  }
  if (tree.OR) {
    return tree.OR.flatMap((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToList(x)));
  }
  return [];
};

const createCoursePrereqs = (
  courseId: string,
  courseTitle: string,
  prereqInfo: Record<string, PrerequisiteTree>,
  prereqLists: Record<string, string[]>,
) =>
  courseTitle.includes("Special Topics")
    ? {
        prerequisiteTree: {},
        prerequisiteText: "Prerequisites vary.",
        prerequisiteList: [],
        prerequisiteFor: [],
      }
    : {
        prerequisiteTree: prereqInfo[courseId] ?? {},
        prerequisiteText: prereqTreeToString(prereqInfo[courseId] ?? {}).slice(1, -1),
        prerequisiteList: prereqLists[courseId] ?? [],
        prerequisiteFor: Object.keys(prereqLists).filter((x) => prereqLists[x].includes(courseId)),
      };

export const createCourses =
  (
    instructorInfo: Record<string, Instructor>,
    prereqInfo: Record<string, PrerequisiteTree>,
    prereqLists: Record<string, string[]>,
  ) =>
  ([
    id,
    {
      department,
      number,
      school,
      title,
      course_level,
      units,
      description,
      department_name,
      repeatability,
      grading_option,
      concurrent,
      same_as,
      restriction,
      overlap,
      corequisite,
      ge_list,
      ge_text,
      terms,
    },
  ]: [string, ScrapedCourse]): Prisma.CourseCreateManyInput => {
    const courseId = `${department} ${number}`;
    return {
      id,
      department,
      courseNumber: number,
      courseNumeric: parseInt(number.replace(/\D/g, ""), 10),
      school,
      title,
      courseLevel:
        divisionCodes[courseLevels.indexOf(course_level as (typeof courseLevels)[number])],
      minUnits: units[0] ?? 0,
      maxUnits: units[1] ?? 0,
      description,
      departmentName: department_name,
      instructorHistory: Object.values(instructorInfo)
        .filter((x) => Object.keys(x.courseHistory ?? {}).includes(courseId))
        .map((x) => x.ucinetid),
      ...createCoursePrereqs(courseId, title, prereqInfo, prereqLists),
      repeatability,
      gradingOption: grading_option,
      concurrent,
      sameAs: same_as,
      restriction,
      overlap,
      corequisites: corequisite,
      geList: ge_list.map((x) => {
        switch (x) {
          case "GE Ia: Lower Division Writing":
            return "GE-1A";
          case "GE Ib: Upper Division Writing":
            return "GE-1B";
          case "GE II: Science and Technology":
            return "GE-2";
          case "GE III: Social & Behavioral Sciences":
            return "GE-3";
          case "GE IV: Arts and Humanities":
            return "GE-4";
          case "GE Va: Quantitative Literacy":
            return "GE-5A";
          case "GE Vb: Formal Reasoning":
            return "GE-5B";
          case "GE VI: Language Other Than English":
            return "GE-6";
          case "GE VII: Multicultural Studies":
            return "GE-7";
          case "GE VIII: International/Global Issues":
            return "GE-8";
          // this branch should never happen
          default:
            throw new Error();
        }
      }),
      geText: ge_text,
      terms: Array.from(
        new Set([
          ...terms.map(transformTerm).filter((x) => x.length),
          ...Object.values(instructorInfo)
            .filter((x) => Object.keys(x.courseHistory ?? {}).includes(courseId))
            .flatMap((x) => x.courseHistory[courseId]),
        ]),
      ).sort(sortTerms),
    };
  };
