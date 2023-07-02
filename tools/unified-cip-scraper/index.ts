import type { PrismaPromise } from "@libs/db";
import { PrismaClient } from "@libs/db";
import { getCourses } from "course-scraper";
import { getInstructors } from "instructor-scraper";
import type { Instructor, PrerequisiteTree } from "peterportal-api-next-types";
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

const transformTerm = (term: string) => {
  const year = parseInt(term.slice(1), 10);
  return `${(year >= 89 ? 1900 : 2000) + year} ${termMapping[term[0]]}`;
};

const upsertCourses =
  (instructorInfo: Record<string, Instructor>, prereqInfo: Record<string, PrerequisiteTree>) =>
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
        .filter((x) => Object.keys(x.courseHistory ?? {}).includes(id))
        .map((x) => x.ucinetid),
      prerequisiteTree: prereqInfo[id] ?? {},
      prerequisiteList: [],
      prerequisiteText: "",
      prerequisiteFor: [],
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
            .filter((x) => Object.keys(x.courseHistory ?? {}).includes(id))
            .map((x) => x.courseHistory[id])
            .flat()
        )
      ).map(transformTerm),
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
  await prisma.$transaction(
    Object.entries(courseInfo).map(upsertCourses(instructorInfo, prereqInfo))
  );
}

main();
