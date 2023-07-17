import { readFileSync } from "fs";

import { PrismaClient } from "@libs/db";
import { Instructor } from "peterportal-api-next-types";
import type { CourseTree } from "prereq-scraper";

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
  const courseInfo = JSON.parse(readFileSync("./courses.json", { encoding: "utf8" })) as Record<
    string,
    ScrapedCourse
  >;
  const instructorInfo = JSON.parse(readFileSync("./instructors.json", { encoding: "utf8" }))
    .result as Record<string, Instructor>;
  const prereqInfo = Object.fromEntries(
    (
      Object.values(
        JSON.parse(readFileSync("./prerequisites.json", { encoding: "utf8" }))
      ) as CourseTree[]
    )
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
