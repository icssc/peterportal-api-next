import { PrismaClient } from "@libs/db";
import { Instructor } from "@peterportal-api/types";

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
    prisma.coursePrereq.deleteMany({ where: { courseId: { in: Object.keys(prereqInfo) } } }),
    prisma.coursePrereq.createMany({
      data: Object.entries(prereqLists).flatMap(([forCourseId, prereqList]) =>
        prereqList.map((courseId) => ({ courseId, forCourseId })),
      ),
      skipDuplicates: true,
    }),
    prisma.instructor.deleteMany({ where: { ucinetid: { in: Object.keys(instructorInfo) } } }),
    prisma.instructor.createMany({
      data: Object.values(instructorInfo),
    }),
    prisma.courseHistory.deleteMany({ where: { ucinetid: { in: Object.keys(instructorInfo) } } }),
    prisma.courseHistory.createMany({
      data: Object.entries(instructorInfo).flatMap(([ucinetid, { courseHistory }]) =>
        Object.entries(courseHistory).flatMap(([courseId, terms]) =>
          terms.map((term) => ({ ucinetid, courseId, term })),
        ),
      ),
    }),
  ]);
}

main().then();
