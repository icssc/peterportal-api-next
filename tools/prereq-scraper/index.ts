import cheerio from "cheerio";
import fetch from "cross-fetch";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Prerequisite, PrerequisiteTree } from "peterportal-api-next-types";
import { fileURLToPath } from "url";
import winston from "winston";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PREREQ_URL = "https://www.reg.uci.edu/cob/prrqcgi";

type DepartmentCourses = {
  [dept: string]: CourseList;
};

type CourseTree = {
  courseId: string;
  courseTitle: string;
  prereqTree: PrerequisiteTree;
};

type CourseList = Array<CourseTree>;

/**
 * Logger object to log info, errors, and warnings
 */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${__dirname}/logs/${Date.now()}.log`,
    }),
  ],
});

/**
 * Scrape all course prerequisite data from the Registrar's website.
 */
export async function getPrereqs(): Promise<DepartmentCourses> {
  if (existsSync(join(__dirname, "prerequisites.json")))
    return JSON.parse(readFileSync(join(__dirname, "prerequisites.json"), { encoding: "utf8" }));
  logger.info("Scraping all course prerequisite data");
  const deptCourses: DepartmentCourses = {};
  try {
    const response = await (await fetch(PREREQ_URL)).text();
    const $ = cheerio.load(response);
    // Get all department options
    const deptOptions = $("select[name='dept'] option");
    for (const deptOption of deptOptions) {
      const dept = $(deptOption).text().trim();
      const url = new URL(PREREQ_URL);
      const params = new URLSearchParams({
        dept: dept,
        action: "view_all",
      });
      url.search = params.toString();
      const courses = await parsePage(url.href);
      if (courses.length > 0) {
        deptCourses[dept] = courses;
      }
    }
  } catch (error) {
    logger.error("Failed to scrape prerequisite data", { error: error });
  }
  logger.info("Finished scraping all course prerequisite data", { data: deptCourses });
  return deptCourses;
}

/**
 * Parse course prerequisites from course page.
 */
async function parsePage(url: string): Promise<CourseList> {
  logger.info(`Parsing ${url}`);
  const courseList: CourseList = [];
  const fieldLabels = {
    Course: 0,
    Title: 1,
    Prerequisite: 2,
  };
  try {
    const response = await (await fetch(url)).text();
    const $ = cheerio.load(response);
    $("table tbody tr").each(function (this: cheerio.Element) {
      const entry = $(this).find("td");
      // Check if row entry is valid
      if ($(entry).length === 3) {
        let courseId = $(entry[fieldLabels.Course]).text().replace(/\s+/g, " ").trim();
        const courseTitle = $(entry[fieldLabels.Title]).text().replace(/\s+/g, " ").trim();
        const prereqList = $(entry[fieldLabels.Prerequisite]).text().replace(/\s+/g, " ").trim();
        // Check if entries have values
        if (!courseId || !courseTitle || !prereqList) return;
        // Some courses are formatted "{old_course} * {current_course} since {date}"
        const matches = courseId.match(/\* ([&A-Z\d ]+) since/);
        if (matches) {
          courseId = matches[1].trim();
        }
        const prereqTree = buildTree(prereqList);
        if (Object.keys(prereqTree).length > 0) {
          courseList.push({
            courseId: courseId,
            courseTitle: courseTitle,
            prereqTree: prereqTree,
          });
        }
      }
      return true;
    });
  } catch (error) {
    logger.error(`Failed to parse ${url}`, { error: error });
  }
  return courseList;
}

function buildTree(prereqList: string): PrerequisiteTree {
  const prereqTree: PrerequisiteTree = { AND: [], NOT: [] };
  const prereqs = prereqList.split(/AND/);
  for (let prereq of prereqs) {
    prereq = prereq.trim();
    if (prereq[0] === "(") {
      // Logical OR
      const oreqs = prereq.slice(1, -1).trim().split(/OR/);
      const oreqTree: PrerequisiteTree = { OR: [] };
      for (const oreq of oreqs) {
        buildORLeaf(oreqTree, oreq.trim());
      }
      oreqTree.OR?.length === 0 ? delete oreqTree.OR : null;
      oreqTree.OR ? prereqTree.AND?.push(oreqTree) : null;
    } else {
      // Logical AND
      buildANDLeaf(prereqTree, prereq);
    }
  }
  prereqTree.AND?.length === 0 ? delete prereqTree.AND : null;
  prereqTree.NOT?.length === 0 ? delete prereqTree.NOT : null;
  return prereqTree;
}

function buildORLeaf(prereqTree: PrerequisiteTree, prereq: string) {
  let req: Prerequisite | null;
  if (prereq.startsWith("NO")) {
    req = parseAntiRequisite(prereq);
  } else {
    req = parseRequisite(prereq);
  }
  req ? prereqTree.OR?.push(req) : null;
}

function buildANDLeaf(prereqTree: PrerequisiteTree, prereq: string) {
  if (prereq.startsWith("NO")) {
    const req = parseAntiRequisite(prereq);
    req ? prereqTree.NOT?.push(req) : null;
  } else {
    const req = parseRequisite(prereq);
    req ? prereqTree.AND?.push(req) : null;
  }
}

function createPrereq(type: string, req: string, grade?: string, coreq?: boolean): Prerequisite {
  const prereq: Prerequisite = { type: "" };
  prereq.type = type;
  if (type === "course") {
    prereq.courseId = req;
  } else {
    prereq.examName = req;
  }
  grade ? (prereq.minGrade = grade) : null;
  coreq ? (prereq.coreq = coreq) : null;
  return prereq;
}

function parseRequisite(requisite: string): Prerequisite | null {
  // Match requisites with format "{course_ID} ( min {grade_type} = {grade} )"
  const reqWithGradeMatch = requisite.match(/^([^()]+)\s+\( min ([^\s]+) = ([^\s]{1,2}) \)$/);
  if (reqWithGradeMatch) {
    if (reqWithGradeMatch[2].trim() === "grade") {
      return createPrereq("course", reqWithGradeMatch[1].trim(), reqWithGradeMatch[3].trim());
    } else {
      return createPrereq("exam", reqWithGradeMatch[1].trim(), reqWithGradeMatch[3].trim());
    }
  }
  // Match courses that are coreq with format "{course_ID} ( coreq )"
  const courseCoreqMatch = requisite.match(/^([^()]+)\s+\( coreq \)$/);
  if (courseCoreqMatch) {
    return createPrereq("course", courseCoreqMatch[1].trim(), undefined, true);
  }
  // Match courses (AP exams included) without minimum grade
  const courseMatch = requisite.match(/^AP.*|^[A-Z0-9&/\s]+\d\S*$/);
  if (courseMatch) {
    if (requisite.startsWith("AP")) {
      return createPrereq("exam", requisite);
    } else {
      return createPrereq("course", requisite);
    }
  }
  return null;
}

function parseAntiRequisite(requisite: string): Prerequisite | null {
  // Match antirequisties - AP exams with format "NO AP {exam_name} score of {grade} or greater"
  const antiAPreqMatch = requisite.match(/^NO\s(AP\s.+?)\sscore\sof\s(\d)\sor\sgreater$/);
  if (antiAPreqMatch) {
    return createPrereq("exam", antiAPreqMatch[1].trim(), antiAPreqMatch[2].trim());
  }
  // Match antirequisites - courses with format "NO {course_ID}"
  const antiCourseMatch = requisite.match(/^NO\s([A-Z0-9&/\s]+\d\S*)$/);
  if (antiCourseMatch) {
    return createPrereq("course", antiCourseMatch[1].trim());
  }
  return null;
}

async function main() {
  const prereqs = await getPrereqs();
  writeFileSync("./prerequisites.json", JSON.stringify(prereqs));
}

main();
