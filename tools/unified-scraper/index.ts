import { PrismaClient } from "@libs/db";
import { getCourses } from "course-scraper";
import { getInstructors } from "instructor-scraper";
import { getPrereqs } from "prereq-scraper";

import type { ScrapedCourse } from "./lib";
import {
  deleteInstructorsAndHistory,
  deletePrereqs,
  prereqTreeToList,
  transformTerm,
  upsertCourses,
} from "./lib";

const prisma = new PrismaClient();

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
  await prisma.$transaction([
    ...Object.entries(courseInfo).map(upsertCourses(prisma, instructorInfo, prereqInfo)),
    ...Object.keys(prereqInfo).map(deletePrereqs(prisma)),
    prisma.coursePrereq.createMany({
      data: Object.entries(prereqLists).flatMap(([forCourseId, prereqList]) =>
        prereqList.map((courseId) => ({ courseId, forCourseId }))
      ),
      skipDuplicates: true,
    }),
    ...Object.keys(instructorInfo).flatMap(deleteInstructorsAndHistory(prisma)),
    prisma.instructor.createMany({
      data: Object.values(instructorInfo).map(({ courseHistory: _, ...data }) => data),
    }),
    prisma.courseHistory.createMany({
      data: Object.entries(instructorInfo).flatMap(([ucinetid, { courseHistory }]) =>
        Object.entries(courseHistory).flatMap(([courseId, terms]) =>
          terms.map((term) => ({ ucinetid, courseId, term: transformTerm(term) }))
        )
      ),
    }),
  ]);
}

main();
