import type { PrismaPromise } from "@libs/db";
import { PrismaClient } from "@libs/db";
import { getCourses } from "course-scraper";
import { getInstructors } from "instructor-scraper";
import type { Instructor, Prerequisite, PrerequisiteTree } from "peterportal-api-next-types";
import { courseLevels, divisionCodes } from "peterportal-api-next-types";
import { getPrereqs } from "prereq-scraper";

type ScrapedCourse = {
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

const prisma = new PrismaClient();

const isPrereq = (obj: Prerequisite | PrerequisiteTree): obj is Prerequisite => "type" in obj;

const prereqToString = (prereq: Prerequisite) => {
  switch (prereq.type) {
    case "course":
      return prereq.courseId ?? "";
    case "exam":
      return prereq.examName ?? "";
  }
};

const prereqTreeToString = (tree: PrerequisiteTree): string => {
  if (tree.AND) {
    return `(${tree.AND.map((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToString(x))).join(
      " AND "
    )})`;
  }
  if (tree.OR) {
    return `(${tree.OR.map((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToString(x))).join(
      " OR "
    )})`;
  }
  if (tree.NOT) {
    return `(${tree.NOT.map((x) =>
      isPrereq(x) ? `NOT ${prereqToString(x)}` : `NOT ${prereqTreeToString(x)}`
    ).join(" AND ")})`;
  }
  return "";
};

const prereqTreeToList = (tree: PrerequisiteTree): string[] => {
  if (tree.AND) {
    return tree.AND.flatMap((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToList(x)));
  }
  if (tree.OR) {
    return tree.OR.flatMap((x) => (isPrereq(x) ? prereqToString(x) : prereqTreeToList(x)));
  }
  return [];
};

const transformTerm = (term: string) => {
  const year = parseInt(term.slice(1), 10);
  return `${(year >= 89 ? 1900 : 2000) + year} ${termMapping[term[0]]}`;
};

const sortTerms = (a: string, b: string) => {
  const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];
  if (a.substring(0, 4) > b.substring(0, 4)) return -1;
  if (a.substring(0, 4) < b.substring(0, 4)) return 1;
  return quarterOrder.indexOf(b.substring(5)) - quarterOrder.indexOf(a.substring(5));
};

const upsertCourses =
  (
    instructorInfo: Record<string, Instructor>,
    prereqInfo: Record<string, PrerequisiteTree>,
    prereqLists: Record<string, string[]>
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
    },
  ]: [string, ScrapedCourse]): PrismaPromise<unknown> => {
    const courseId = `${department} ${number}`;
    const course = {
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
      prerequisiteTree: prereqInfo[courseId] ?? {},
      prerequisiteList: prereqLists[courseId],
      prerequisiteText: prereqTreeToString(prereqInfo[courseId] ?? {}).slice(1, -1),
      prerequisiteFor: Object.keys(prereqLists).filter((x) => prereqLists[x].includes(courseId)),
      repeatability,
      gradingOption: grading_option,
      concurrent,
      sameAs: same_as,
      restriction,
      overlap,
      corequisites: corequisite,
      geList: ge_list,
      geText: ge_text,
      terms: Array.from(
        new Set(
          Object.values(instructorInfo)
            .filter((x) => Object.keys(x.courseHistory ?? {}).includes(courseId))
            .flatMap((x) => x.courseHistory[courseId])
        )
      )
        .map(transformTerm)
        .sort(sortTerms),
    };
    return prisma.course.upsert({
      where: { id },
      create: course,
      update: course,
    });
  };

async function main() {
  const courseInfo = (await getCourses()) as Record<string, ScrapedCourse>;
  const instructorInfo = (await getInstructors()).result;
  const prereqInfo = Object.fromEntries(
    Object.values(await getPrereqs())
      .flat()
      .map(({ courseId, prereqTree }) => [courseId, prereqTree])
  );
  const prereqLists = Object.fromEntries(
    Object.entries(prereqInfo).map(([courseId, prereqTree]) => [
      courseId,
      prereqTreeToList(prereqTree ?? {}),
    ])
  );
  await prisma.$transaction(
    Object.entries(courseInfo).map(upsertCourses(instructorInfo, prereqInfo, prereqLists))
  );
}

main();
