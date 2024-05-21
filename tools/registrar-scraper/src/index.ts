import type { Instructor } from "@anteater-api/types";
import { PrismaClient } from "@libs/db";
import { notNull } from "@libs/utils";

import { getCourses } from "./course-scraper";
import { getInstructors } from "./instructor-scraper";
import { createCourses, prereqTreeToList, sortTerms, transformTerm } from "./lib";
import type { CourseList } from "./prereq-scraper";
import { getPrereqs } from "./prereq-scraper";

const prisma = new PrismaClient();

async function main() {
  const courseInfo = await getCourses();
  const instructorInfo = Object.fromEntries(
    Object.entries((await getInstructors()).result as Record<string, Instructor>).map(
      ([ucinetid, instructor]) => [
        ucinetid,
        {
          ...instructor,
          courseHistory: Object.fromEntries(
            Object.entries(instructor.courseHistory).map(([course, terms]) => [
              course,
              terms
                .map(transformTerm)
                .filter((x) => x.length)
                .sort(sortTerms),
            ]),
          ),
        },
      ],
    ),
  );
  const prereqInfo = Object.fromEntries(
    (Object.values(await getPrereqs()) as CourseList[])
      .flat()
      .map(({ courseId, prereqTree }) => [courseId, prereqTree]),
  );
  const prereqLists = Object.fromEntries(
    Object.entries(prereqInfo).map(([courseId, prereqTree]) => [
      courseId,
      prereqTreeToList(prereqTree ?? {}),
    ]),
  );
  await prisma.$transaction([
    prisma.course.deleteMany({ where: { id: { in: Object.keys(courseInfo) } } }),
    prisma.course.createMany({
      data: Object.entries(courseInfo).map(createCourses(instructorInfo, prereqInfo, prereqLists)),
      skipDuplicates: true,
    }),
    prisma.instructor.deleteMany({ where: { ucinetid: { in: Object.keys(instructorInfo) } } }),
    prisma.instructor.createMany({
      data: Object.values(instructorInfo),
    }),
  ]);
  const courses = Object.fromEntries((await prisma.course.findMany()).map((x) => [x.id, x]));
  const instructors = Object.fromEntries(
    (await prisma.instructor.findMany()).map((x) => [x.ucinetid, x]),
  );
  const newCourses = Object.values(courses).map((course) => ({
    ...course,
    prerequisiteTree: course.prerequisiteTree as object,
    instructors: course.instructorHistory
      .map((x) => instructors[x])
      .filter(notNull)
      .map(({ ucinetid, name, shortenedName }) => ({ ucinetid, name, shortenedName })),
    prerequisites: course.prerequisiteList
      .map((x) => courses[x.replace(/ /g, "")])
      .filter(notNull)
      .map(({ id, title, department, courseNumber }) => ({
        id,
        title,
        department,
        courseNumber,
      })),
    dependencies: course.prerequisiteFor
      .map((x) => courses[x.replace(/ /g, "")])
      .filter(notNull)
      .map(({ id, title, department, courseNumber }) => ({
        id,
        title,
        department,
        courseNumber,
      })),
  }));
  const newInstructors = Object.values(instructors).map((instructor) => ({
    ...instructor,
    courseHistory: instructor.courseHistory as object,
    courses: Object.keys(instructor.courseHistory!)
      .map((x) => courses[x.replace(/ /g, "")])
      .filter(notNull)
      .map(({ id, title, department, courseNumber }) => ({
        id,
        title,
        department,
        courseNumber,
      })),
  }));
  await prisma.$transaction([
    prisma.course.deleteMany({ where: { id: { in: Object.keys(courses) } } }),
    prisma.instructor.deleteMany({ where: { ucinetid: { in: Object.keys(instructors) } } }),
    prisma.course.createMany({
      data: newCourses,
      skipDuplicates: true,
    }),
    prisma.instructor.createMany({
      data: newInstructors,
      skipDuplicates: true,
    }),
  ]);
}

main().then();
