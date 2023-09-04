import { PrismaClient } from "@libs/db";
import { getTermDateData } from "@libs/registrar-api";
import type {
  GE,
  Quarter,
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "@libs/websoc-api-next";
import { callWebSocAPI, getDepts, getTerms, geCodes, sectionTypes } from "@libs/websoc-api-next";
import { createLogger, format, transports } from "winston";

/**
 * An entry that contains the term name and the term object.
 */
type TermEntry = [string, Term];

/**
 * Section that also contains all relevant WebSoc metadata.
 */
type EnhancedSection = {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
};

/**
 * Object that contains all relevant data for a term.
 */
type ScrapedTerm = {
  /**
   * All ``WebsocAPIResponses`` returned by querying a department.
   */
  department: Record<string, WebsocAPIResponse>;
  /**
   * All ``WebsocAPIResponses`` returned by querying a GE category.
   */
  ge: Record<string, WebsocAPIResponse>;
};

/**
 * An instructor object that can be inserted directly into Prisma.
 */
type ProcessedInstructor = {
  year: string;
  quarter: Quarter;
  sectionCode: number;
  timestamp: Date;
  name: string;
};

/**
 * A meeting object that can be inserted directly into Prisma.
 */
type ProcessedMeeting = {
  year: string;
  quarter: Quarter;
  sectionCode: number;
  timestamp: Date;
  days: string[];
  daysString: string;
  startTime: number;
  endTime: number;
};

/**
 * A meeting building object that can be inserted directly into Prisma.
 */
type ProcessedMeetingBuilding = {
  year: string;
  quarter: Quarter;
  sectionCode: number;
  timestamp: Date;
  daysString: string;
  startTime: number;
  endTime: number;
  bldg: string;
};

/**
 * A section object containing additional metadata.
 */
type ProcessedSection = {
  /**
   * Contains the instructors and meetings associated with this section.
   */
  meta: {
    instructors: ProcessedInstructor[];
    meetings: ProcessedMeeting[];
    buildings: ProcessedMeetingBuilding[];
  };
  /**
   * The section object that can be inserted directly into Prisma.
   */
  data: {
    year: string;
    quarter: Quarter;
    sectionCode: number;
    timestamp: Date;
    geCategories: GE[];
    department: string;
    courseNumber: string;
    courseNumeric: number;
    courseTitle: string;
    sectionType: (typeof sectionTypes)[number];
    units: string;
    maxCapacity: number;
    sectionFull: boolean;
    waitlistFull: boolean;
    overEnrolled: boolean;
    cancelled: boolean;
    data: object;
  };
};

/**
 * The duration to sleep between requests.
 * Default: 500 ms
 */
const REQUEST_SLEEP_DURATION = 500;

/**
 * The duration to sleep between scraping runs, or if rate-limited.
 * Default: 3 minutes in ms
 */
const SLEEP_DURATION = 3 * 60 * 1000;

/**
 * The duration to sleep when an error is caught.
 * Default: 30 minutes in ms
 */
const ERROR_SLEEP_DURATION = 30 * 60 * 1000;

const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

const prisma = new PrismaClient();

const logger = createLogger({
  level: "debug",
  format:
    process.env.NODE_ENV === "development"
      ? format.combine(
          format.colorize({ all: true }),
          format.timestamp(),
          format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`),
        )
      : format.printf((info) => `[${info.level}] ${info.message}`),
  transports: [new transports.Console()],
  exitOnError: false,
});

/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
const sleep = async (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

/**
 * Get all terms that are to be scraped on a daily basis.
 * @param date The current date.
 */
async function getTermsToScrape(date: Date) {
  const termDateData = await Promise.all(
    [-1, 0, 1].map((x) => getTermDateData((date.getFullYear() + x).toString())),
  );
  const quarterDates = termDateData.reduce((p, c) => Object.assign(p, c), {});
  const terms = await getTerms();
  const termEntries = terms
    .map((term) => term.shortName)
    .filter((term) => Object.keys(quarterDates).includes(term))
    .filter((term) => date <= quarterDates[term].finalsStart)
    .map((term) => {
      const termEntry: TermEntry = [
        term,
        { year: term.split(" ")[0], quarter: term.split(" ")[1] as Quarter },
      ];
      return termEntry;
    });
  return Object.fromEntries(termEntries);
}

/**
 * Get unique array of meetings.
 */
const getUniqueMeetings = (meetings: WebsocSectionMeeting[]) =>
  meetings.reduce((acc, meeting) => {
    if (!acc.find((m) => m.days === meeting.days && m.time === meeting.time)) {
      acc.push(meeting);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);

/**
 * Given all parent data about a section, isolate relevant data.
 * @returns ``WebsocAPIResponse`` with all deduped, relevant metadata.
 */
function isolateSection(data: EnhancedSection): WebsocAPIResponse {
  const section = {
    ...data.section,
    meetings: getUniqueMeetings(data.section.meetings),
  };

  const course = {
    ...data.course,
    sections: [section],
  };

  const department = {
    ...data.department,
    courses: [course],
  };

  const school = {
    ...data.school,
    departments: [department],
  };

  return { schools: [school] };
}

function courseNumberToNumeric(courseNumber: string) {
  const n = parseInt(courseNumber.replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseStartAndEndTimes(time: string) {
  let startTime = -1;
  let endTime = -1;
  if (time !== "TBA") {
    const [startTimeString, endTimeString] = time
      .trim()
      .split("-")
      .map((x) => x.trim());
    const [startTimeHour, startTimeMinute] = startTimeString.split(":");
    startTime = (parseInt(startTimeHour, 10) % 12) * 60 + parseInt(startTimeMinute, 10);
    const [endTimeHour, endTimeMinute] = endTimeString.split(":");
    endTime = (parseInt(endTimeHour, 10) % 12) * 60 + parseInt(endTimeMinute, 10);
    if (endTimeMinute.includes("p")) {
      startTime += 12 * 60;
      endTime += 12 * 60;
    }
    if (startTime > endTime) startTime -= 12 * 60;
  }
  return { startTime, endTime };
}

/**
 * Forces the V8 garbage collector to run, printing the memory usage before and
 * after the fact.
 *
 * Requires the ``--expose-gc`` flag to be set, otherwise this is a no-op aside
 * from printing the same memory usage twice.
 */
function forceGC() {
  logger.debug("Memory usage:");
  logger.debug(JSON.stringify(process.memoryUsage()));
  logger.debug("Forcing garbage collection");
  global.gc?.();
  logger.debug("Memory usage:");
  logger.debug(JSON.stringify(process.memoryUsage()));
}

/**
 * The scraping function.
 * @param name The name of the term to scrape.
 * @param term The parameters of the term to scrape.
 */
async function scrape(name: string, term: Term) {
  forceGC();
  logger.info(`Scraping term ${name}`);

  const depts = await getDepts();

  /** All departments to scrape. */
  const deptCodes = depts.map((dept) => dept.deptValue).filter((deptValue) => deptValue !== "ALL");

  /** The data structure that holds all scraped data. */
  const results: Record<string, ScrapedTerm> = {
    [`${term.year} ${term.quarter}`]: {
      department: {},
      ge: {},
    },
  };

  for (const department of deptCodes) {
    logger.info(`Scraping ${department}`);
    let done = false;
    while (!done) {
      try {
        results[name].department[department] = await callWebSocAPI(term, {
          department,
        });
        done = true;
      } catch (e) {
        if (e instanceof Error) {
          logger.error(`${e.name}: ${e.message}`);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }
        logger.info("Rate limited, sleeping for 3 minutes");
        await sleep(SLEEP_DURATION);
      }
    }
    await sleep(REQUEST_SLEEP_DURATION);
  }

  for (const ge of geCodes) {
    logger.info(`Scraping ${ge}`);
    let done = false;
    while (!done) {
      try {
        results[name].ge[ge] = await callWebSocAPI(term, { ge });
        done = true;
      } catch (e) {
        if (e instanceof Error) {
          logger.error(`${e.name}: ${e.message}`);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }
        logger.info("Rate limited, sleeping for 3 minutes");
        await sleep(SLEEP_DURATION);
      }
    }
    await sleep(REQUEST_SLEEP_DURATION);
  }

  /** The timestamp for this scraping run. */
  const timestamp = new Date();

  const res: Record<string, ProcessedSection> = {};

  logger.info("Processing all sections");

  for (const [term, data] of Object.entries(results)) {
    for (const response of Object.values(data.department)) {
      for (const school of response.schools) {
        for (const department of school.departments) {
          for (const course of department.courses) {
            for (const section of course.sections) {
              const [year, quarter] = term.split(" ") as [string, Quarter];
              const sectionCode = parseInt(section.sectionCode, 10);
              res[`${term} ${section.sectionCode}`] = {
                meta: {
                  instructors: section.instructors.map((name) => ({
                    year,
                    quarter,
                    sectionCode,
                    timestamp,
                    name,
                  })),
                  meetings: section.meetings.map((m) => ({
                    year,
                    quarter,
                    sectionCode,
                    timestamp,
                    days: days.filter((x) => m.days.includes(x)),
                    daysString: m.days,
                    ...parseStartAndEndTimes(m.time),
                  })),
                  buildings: section.meetings.flatMap((m) =>
                    m.bldg.map((bldg) => ({
                      year,
                      quarter,
                      sectionCode,
                      timestamp,
                      daysString: m.days,
                      ...parseStartAndEndTimes(m.time),
                      bldg,
                    })),
                  ),
                },
                data: {
                  year,
                  quarter,
                  sectionCode: parseInt(section.sectionCode, 10),
                  timestamp,
                  geCategories: [],
                  department: department.deptCode,
                  courseNumber: course.courseNumber,
                  courseNumeric: courseNumberToNumeric(course.courseNumber),
                  courseTitle: course.courseTitle,
                  sectionType: section.sectionType as ProcessedSection["data"]["sectionType"],
                  units: section.units,
                  maxCapacity: parseInt(section.maxCapacity, 10),
                  sectionFull: section.status === "FULL" || section.status === "Waitl",
                  waitlistFull: section.status === "FULL",
                  overEnrolled:
                    parseInt(section.numCurrentlyEnrolled.totalEnrolled, 10) >
                    parseInt(section.maxCapacity, 10),
                  cancelled: section.sectionComment.includes("***  CANCELLED  ***"),
                  data: isolateSection({ school, department, course, section }),
                },
              };
            }
          }
        }
      }
    }
    Object.entries(data.ge).forEach(([geCategory, response]) => {
      response.schools.forEach((school) => {
        school.departments.forEach((department) => {
          department.courses.forEach((course) => {
            course.sections.forEach((section) => {
              if (res[`${term} ${section.sectionCode}`]) {
                res[`${term} ${section.sectionCode}`].data.geCategories.push(geCategory as GE);
              }
            });
          });
        });
      });
    });
  }

  logger.info(`Processed ${Object.keys(res).length} sections`);

  let connected = false;
  while (!connected) {
    try {
      await prisma.$connect();
      connected = true;
    } catch (e) {
      logger.error(`Failed to connect to database`);
      if (e instanceof Error) {
        logger.error(e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }
      logger.info("Sleeping for 3 minutes");
      await sleep(SLEEP_DURATION);
    }
  }

  const [sectionsCreated, instructorsCreated, meetingsCreated, buildingsCreated] =
    await prisma.$transaction([
      prisma.websocSection.createMany({
        data: Object.values(res).map((d) => d.data),
      }),
      prisma.websocSectionInstructor.createMany({
        data: Object.values(res).flatMap((d) => d.meta.instructors),
      }),
      prisma.websocSectionMeeting.createMany({
        data: Object.values(res).flatMap((d) => d.meta.meetings),
      }),
      prisma.websocSectionMeetingBuilding.createMany({
        data: Object.values(res).flatMap((d) => d.meta.buildings),
      }),
    ]);

  logger.info(`Inserted ${sectionsCreated.count} sections`);
  logger.info(`Inserted ${instructorsCreated.count} instructors`);
  logger.info(`Inserted ${meetingsCreated.count} meetings`);
  logger.info(`Inserted ${buildingsCreated.count} buildings`);

  const params = {
    where: {
      year: term.year,
      quarter: term.quarter,
      timestamp: { lt: timestamp },
    },
  };

  const [instructorsDeleted, buildingsDeleted, meetingsDeleted, sectionsDeleted] =
    await prisma.$transaction([
      prisma.websocSectionInstructor.deleteMany(params),
      prisma.websocSectionMeetingBuilding.deleteMany(params),
      prisma.websocSectionMeeting.deleteMany(params),
      prisma.websocSection.deleteMany(params),
    ]);

  logger.info(`Removed ${instructorsDeleted.count} instructors`);
  logger.info(`Removed ${buildingsDeleted.count} buildings`);
  logger.info(`Removed ${meetingsDeleted.count} meetings`);
  logger.info(`Removed ${sectionsDeleted.count} sections`);
  logger.info("Sleeping for 3 minutes");

  await sleep(SLEEP_DURATION);
}

/**
 * The entry point of the program.
 */
async function main() {
  try {
    logger.info("websoc-scraper-v2 starting");
    const now = new Date();
    const termsInScope = await getTermsToScrape(now);
    for (const [name, term] of Object.entries(termsInScope)) await scrape(name, term);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
      logger.error(e.stack);
    } else {
      logger.error(e);
    }
    logger.info("Sleeping for 30 minutes");
    await sleep(ERROR_SLEEP_DURATION);
  }
}

main().then(() => []);
