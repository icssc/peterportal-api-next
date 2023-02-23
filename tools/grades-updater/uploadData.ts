import { type CastingContext, type Parser, parse } from "csv-parse";
import { PrismaClient } from "db";
import fs from "fs";
import { resolve } from "path";

import { __dirname, dataColumns, logger } from "./gradesUpdaterUtil";

const prisma: PrismaClient = new PrismaClient();

/**
 * Create a parser to read the CSV file's content.
 * @param filePath The absolute path to the CSV file.
 * @returns A parser to extract the information in the CSV file.
 */
function createParser(filePath: string): Parser {
  return fs.createReadStream(filePath).pipe(
    parse({
      cast: (value: string, context: CastingContext): any => {
        switch (context.column) {
          case "year":
          case "quarter":
          case "department":
          case "courseNumber":
          case "instructors":
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
 * Take the CSV file under /outputData, extract the information as JSON
 * objects, and upload the content to a remote database.
 * @param filePath The absolute path to the CSV file.
 */
async function processFile(filePath: string): Promise<void> {
  const data: object[] = [];
  const courseParser: Parser = createParser(filePath);
  for await (const course of courseParser) {
    data.push({
      academic_year:
        course.quarter.startsWith("Summer") || course.quarter === "Fall"
          ? parseInt(course.year.substring(0, 4))
          : parseInt(course.year.substring(0, 4)) + 1,
      academic_quarter: course.quarter,
      department: course.department,
      course_number: course.courseNumber,
      course_code: course.courseCode,
      grade_a_count: course.a,
      grade_b_count: course.b,
      grade_c_count: course.c,
      grade_d_count: course.d,
      grade_f_count: course.f,
      grade_p_count: course.p,
      grade_np_count: course.np,
      grade_w_count: course.w,
      average_gpa: course.gpaAvg,
      grades_instructors_mappings: {
        create: course.instructors
          .split("; ")
          .map((name: string) => ({ instructor: name })),
      },
    });
  }
  await prisma.grades.createMany({ data });
}

/**
 * The entry point of this program.
 */
async function uploadData(): Promise<void> {
  if (fs.existsSync(`${__dirname}/outputData`) === false) {
    throw new Error("Please create /outputData first");
  }

  const paths: string[] = fs
    .readdirSync(resolve(`${__dirname}/outputData`))
    .map((file: string) => resolve(`${__dirname}/outputData/${file}`));
  for (const path of paths) {
    logger.info(`Start processing ${path}`);
    await processFile(path);
    logger.info(`Finish processing ${path}`);
  }
}

uploadData().catch((error: any) =>
  logger.error("Error encountered", { trace: error.stack })
);
