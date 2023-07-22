import { readFileSync } from "fs";

import { PrismaClient } from "@libs/db";
import { Instructor } from "peterportal-api-next-types";
import type { CourseTree } from "prereq-scraper";

import type { ScrapedCourse } from "./lib";
import { createCourses, prereqTreeToList, sortTerms, transformTerm } from "./lib";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
});

prisma.$on("query", (e) => {
  console.log("Query: " + e.query);
  console.log("Params: " + e.params);
  console.log("Duration: " + e.duration + "ms");
});

async function main() {
  const courseInfo = JSON.parse(readFileSync("./courses.json", { encoding: "utf8" })) as Record<
    string,
    ScrapedCourse
  >;
  const instructorInfo = Object.fromEntries(
    Object.entries(
      JSON.parse(readFileSync("./instructors.json", { encoding: "utf8" })).result as Record<
        string,
        Instructor
      >,
    ).map(([ucinetid, instructor]) => [
      ucinetid,
      {
        ...instructor,
        courseHistory: Object.fromEntries(
          Object.entries(instructor.courseHistory).map(([course, terms]) => [
            course,
            terms.map(transformTerm).sort(sortTerms),
          ]),
        ),
      },
    ]),
  );
  const prereqInfo = Object.fromEntries(
    (
      Object.values(
        JSON.parse(readFileSync("./prerequisites.json", { encoding: "utf8" })),
      ) as CourseTree[]
    )
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
    prisma.course.deleteMany({ where: { id: { in: Object.keys(prereqInfo) } } }),
    prisma.coursePrereq.createMany({
      data: Object.entries(prereqLists).flatMap(([forCourseId, prereqList]) =>
        prereqList.map((courseId) => ({ courseId, forCourseId })),
      ),
      skipDuplicates: true,
    }),
    prisma.courseHistory.deleteMany({ where: { ucinetid: { in: Object.keys(instructorInfo) } } }),
    prisma.instructor.deleteMany({ where: { ucinetid: { in: Object.keys(instructorInfo) } } }),
    prisma.instructor.createMany({
      data: Object.values(instructorInfo),
    }),
    prisma.courseHistory.createMany({
      data: Object.entries(instructorInfo).flatMap(([ucinetid, { courseHistory }]) =>
        Object.entries(courseHistory).flatMap(([courseId, terms]) =>
          terms.map((term) => ({ ucinetid, courseId, term })),
        ),
      ),
    }),
  ]);
}

main();
