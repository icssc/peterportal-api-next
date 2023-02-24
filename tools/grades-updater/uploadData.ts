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
            return value
              .split("; ")
              .map((name: string) => ({ instructor: name }));
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
 * @param quarter Either "Summer", "Fall", "Winter", or "Spring."
 * @returns The academic year in the format of "XXXX."
 */
function parseYear(
  year: string,
  quarter: "Fall" | "Winter" | "Spring" | "Summer"
): number {
  return quarter.startsWith("Summer") || quarter === "Fall"
    ? parseInt(year.substring(0, 4))
    : parseInt(year.substring(0, 4)) + 1;
}

/**
 * Take the CSV file under /outputData, extract the information as JSON
 * objects, and insert the content to a remote database.
 * @param filePath The absolute path to the CSV file.
 */
async function processFile(filePath: string): Promise<void> {
  const grades: string[] = [],
    instructors: string[] = [];
  const courseParser: Parser = createParser(filePath);

  for await (const course of courseParser) {
    grades.push(
      `(${parseYear(course.year, course.quarter)}, "${course.quarter}",
        "${course.department}", "${course.courseNumber}", ${course.courseCode},
        ${course.a}, ${course.b}, ${course.c}, ${course.d}, ${course.f},
        ${course.p}, ${course.np}, ${course.w}, ${course.gpaAvg})`
    );
    for (const instructor of course.instructors) {
      instructors.push(
        `(${parseYear(course.year, course.quarter)}, "${course.quarter}",
          ${course.courseCode}, "${instructor}")`
      );
    }
  }

  // Cannot use executeRaw() because it has some limitations
  // on template variables.
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      INSERT INTO grades (
        academic_year, academic_quarter, department, course_number,
        course_code, grade_a_count, grade_b_count, grade_c_count,
        grade_d_count, grade_f_count, grade_p_count, grade_np_count,
        grade_w_count, average_gpa) VALUES ${grades.join(", ")};
    `),
    prisma.$executeRawUnsafe(`
      INSERT INTO grades_instructors_mappings VALUES
        ${instructors.join(", ")};
    `),
  ]);
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

/*  
  ORMs really hurt my brain :-(
  P.S. It will make processFile() to run really slow because Prisma does
  not implement batch insert well.

  let operations = [];
  operations.push(prisma.grades.create({
    data: {
      academic_year: parseYear(course.year, course.quarter),
      academic_quarter: course.quarter,
      departments: {
        connectOrCreate: {
          create: {
            department_id: course.department,

            // This will create problems moving forward when
            // a new department is created while the departments
            // table does not list it?
            department_name: course.department
          },
          where: { department_id: course.department },
        },
      },
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
        createMany: {
          data: course.instructors,
        },
      },
    },
  }));
  prisma.$transaction(operations);
*/
