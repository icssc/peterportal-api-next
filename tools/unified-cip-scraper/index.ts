import { PrismaClient } from "@libs/db";
import { getCourses } from "course-scraper";
import { getInstructors } from "instructor-scraper";
import { getPrereqs } from "prereq-scraper";

import { type ScrapedCourse } from "./lib";
import { prereqTreeToList, upsertCourses } from "./lib";

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
  await prisma.$transaction(
    Object.entries(courseInfo).map(upsertCourses(prisma, instructorInfo, prereqInfo, prereqLists))
  );
}

main();
