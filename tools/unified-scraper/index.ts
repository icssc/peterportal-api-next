import { PrismaClient } from "@libs/db";
import { getCourses } from "course-scraper";
import { getInstructors } from "instructor-scraper";
import pLimit from "p-limit";
import { getPrereqs } from "prereq-scraper";

import type { ScrapedCourse } from "./lib";
import {
  deleteInstructorsAndHistory,
  deletePrereqs,
  prereqTreeToList,
  transformTerm,
  upsertCourses,
} from "./lib";

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + e.params)
  console.log('Duration: ' + e.duration + 'ms')
});

async function main() {
  const limit = pLimit(1);
  const [courses, instructors, prereqs] = await Promise.all([
    limit(() => getCourses()),
    limit(() => getInstructors()),
    limit(() => getPrereqs()),
  ])
  const courseInfo = courses as Record<string, ScrapedCourse>;
  const instructorInfo = instructors.result;
  const prereqInfo = Object.fromEntries(
    Object.values(prereqs)
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
