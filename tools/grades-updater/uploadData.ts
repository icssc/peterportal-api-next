import { type CastingContext, type Parser, parse } from "csv-parse";
import { PrismaClient } from "db";
import fs from "fs";
import { resolve } from "path";
import type { Quarter } from "peterportal-api-next-types";

import {
  __dirname,
  dataColumns,
  handleError,
  logger,
} from "./gradesUpdaterUtil";

type Section = {
  year: number;
  quarter: string;
  instructors: string[];
  department: string;
  courseNumber: string;
  sectionCode: number;
  gradeACount: number;
  gradeBCount: number;
  gradeCCount: number;
  gradeDCount: number;
  gradeFCount: number;
  gradePCount: number;
  gradeNPCount: number;
  gradeWCount: number;
  averageGPA: number;
};

const prisma = new PrismaClient();

/**
 * Create a parser to read the CSV file's content.
 * @param filePath The absolute path to the CSV file.
 * @returns A parser to extract the information in the CSV file.
 */
function createParser(filePath: string): Parser {
  return fs.createReadStream(filePath).pipe(
    parse({
      cast: (value: string, context: CastingContext) => {
        switch (context.column) {
          case "year":
          case "quarter":
          case "department":
          case "courseNumber":
            return value;
          case "courseCode":
          case "a":
          case "b":
          case "c":
          case "d":
          case "f":
          case "p":
          case "np":
          case "w":
            return parseInt(value || "0");
          case "instructors":
            return new Set(value.split("; "));
          case "gpaAvg":
            return parseFloat(value || "0");
          default:
            throw new SyntaxError(`Unknown entry: ${context.column}=${value}`);
        }
      },
      columns: dataColumns,
      from_line: 2,
      skip_empty_lines: true,
      trim: true,
    })
  );
}

/**
 * Calculate the real academic year for the course.
 * @param year The academic year for the course in the format "XXXX-XX."
 * @param quarter "Summer1", "Summer10wk", "Summer2", "Fall",
 * "Winter", or "Spring."
 * @returns The academic year in the format of "XXXX."
 */
function parseYear(year: string, quarter: Quarter): number {
  return quarter.startsWith("Summer") || quarter === "Fall"
    ? parseInt(year.substring(0, 4))
    : parseInt(year.substring(0, 4)) + 1;
}

/**
 * Take the CSV file under /outputData, extract the information as JSON
 * objects, and turn the data into two long strings.
 * @param filePath The absolute path to the CSV file.
 * @returns An array of strings to be concatenated to two SQL queries.
 */
async function processFile(filePath: string): Promise<Section[]> {
  const sections: Section[] = [];
  const courseParser = createParser(filePath);

  for await (const course of courseParser) {
    sections.push({
      year: parseYear(course.year, course.quarter),
      quarter: course.quarter,
      instructors: Array.from(course.instructors),
      department: course.department,
      courseNumber: course.courseNumber,
      sectionCode: course.courseCode,
      gradeACount: course.a,
      gradeBCount: course.b,
      gradeCCount: course.c,
      gradeDCount: course.d,
      gradeFCount: course.f,
      gradePCount: course.p,
      gradeNPCount: course.np,
      gradeWCount: course.w,
      averageGPA: course.gpaAvg,
    });
  }

  return sections;
}

/**
 * Upload the section to the remote database.
 * @param sections The sections to upload.
 */
async function processData(sections: Section[]): Promise<void> {
  await Promise.all(
    Array.from(new Set(sections.map((s) => s.instructors).flat())).map((i) =>
      prisma.gradesInstructor.upsert({
        where: { name: i },
        update: {},
        create: { name: i },
      })
    )
  );
  await Promise.all(
    sections.map((s) =>
      prisma.gradesSection.create({
        data: {
          ...s,
          instructors: {
            connect: s.instructors.map((i) => ({
              name: i,
            })),
          },
        },
      })
    )
  );
}

/**
 * The entry point of this program.
 */
async function uploadData(): Promise<void> {
  if (!fs.existsSync(`${__dirname}/outputData`)) {
    throw new Error("Please create /outputData first");
  }

  const paths = fs
    .readdirSync(resolve(`${__dirname}/outputData`))
    .map((file: string) => resolve(`${__dirname}/outputData/${file}`));
  for (const path of paths) {
    logger.info(`Started processing ${path}`);
    const sections = await processFile(path);
    await processData(sections);
    logger.info(`Finished processing ${path}`);
  }
}

uploadData().catch(handleError);
