import { PrismaClient } from "db";
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
} from "peterportal-api-next-types";
import { geCodes, sectionTypes } from "peterportal-api-next-types";
import { getTermDateData } from "registrar-api";
import {
  type WebsocAPIOptions,
  callWebSocAPI,
  getDepts,
  getTerms,
} from "websoc-api-next";
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
  buildings: string[];
  startTime: number;
  endTime: number;
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
 * The duration to sleep between scraping runs, or to wait before querying the
 * database for terms to scrape on demand if there were none in the last query.
 * default: 5 minutes
 */
const SLEEP_DURATION = 5 * 60 * 1000;

const prisma = new PrismaClient();

const logger = createLogger({
  level: "info",
  format: format.combine(
    process.env.NODE_ENV === "development"
      ? format.colorize({ all: true })
      : format.uncolorize(),
    format.timestamp(),
    format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

/**
 * Get all terms that are to be scraped on a daily basis.
 * @param date The current date.
 */
async function getTermsToScrape(date: Date) {
  const termDateData = await Promise.all([
    ...Array.from(Array(3).keys()).map((x) =>
      getTermDateData((x + date.getFullYear() - 1).toString())
    ),
  ]);
  const quarterDates = Object.assign({}, ...termDateData);
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
function getUniqueMeetings(meetings: WebsocSectionMeeting[]) {
  return meetings.reduce((acc, meeting) => {
    if (!acc.find((m) => m.days === meeting.days && m.time === meeting.time)) {
      acc.push(meeting);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);
}

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

/**
 * The scraping function.
 * @param name The name of the term to scrape.
 * @param term The parameters of the term to scrape.
 */
async function scrape(name: string, term: Term) {
  logger.info(`Scraping term ${name}`);
  // The timestamp for this scraping run.
  const timestamp = new Date();
  const depts = await getDepts();

  // All departments to scrape.
  const deptCodes = depts
    .map((dept) => dept.deptValue)
    .filter((deptValue) => deptValue !== "ALL");
  // The data structure that holds all scraped data.
  const results: Record<string, ScrapedTerm> = {
    [`${term.year} ${term.quarter}`]: {
      department: {},
      ge: {},
    },
  };
  // The list of parameters to pass to ``callWebSocAPI``.
  let inputs: [Term, WebsocAPIOptions][] = [
    ...deptCodes.map(
      (department) => [term, { department }] as [Term, WebsocAPIOptions]
    ),
    ...geCodes.map((ge) => [term, { ge }] as [Term, WebsocAPIOptions]),
  ];
  for (;;) {
    logger.info(`Making ${inputs.length} concurrent calls to WebSoc`);
    const settledResults = await Promise.allSettled(
      inputs.map(([term, options]) =>
        callWebSocAPI(term, { ...options, cancelledCourses: "Include" })
      )
    );
    const fulfilledIndices: number[] = [];
    for (const [i, res] of Object.entries(settledResults)) {
      if (res.status === "fulfilled") {
        const idx = parseInt(i);
        const input = inputs[idx];
        const term = `${input[0].year} ${input[0].quarter}`;
        if (input[1].department) {
          results[term].department[input[1].department] = res.value;
        } else if (input[1].ge) {
          results[term].ge[input[1].ge] = res.value;
        }
        fulfilledIndices.push(idx);
      }
    }
    inputs = inputs.filter((_, i) => !fulfilledIndices.includes(i));
    logger.info(
      `${fulfilledIndices.length} calls succeeded, ${inputs.length} remain`
    );
    if (!inputs.length) break;
    logger.info("Sleeping for 1 minute");
    await sleep(60 * 1000);
  }
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
                    days: ["Su", "M", "Tu", "W", "Th", "F", "Sa"].filter((x) =>
                      m.days.includes(x)
                    ),
                    buildings: m.bldg,
                    ...(() => {
                      let startTime = -1;
                      let endTime = -1;
                      if (m.time !== "TBA") {
                        const [startTimeString, endTimeString] = m.time
                          .trim()
                          .split("-")
                          .map((x) => x.trim());
                        const [startTimeHour, startTimeMinute] =
                          startTimeString.split(":");
                        startTime =
                          parseInt(startTimeHour) * 60 +
                          parseInt(startTimeMinute);
                        const [endTimeHour, endTimeMinute] =
                          endTimeString.split(":");
                        endTime =
                          parseInt(endTimeHour) * 60 + parseInt(endTimeMinute);
                        if (endTimeMinute.includes("p")) {
                          startTime += 12 * 60;
                          endTime += 12 * 60;
                        }
                      }
                      return { startTime, endTime };
                    })(),
                  })),
                },
                data: {
                  year,
                  quarter,
                  sectionCode: parseInt(section.sectionCode, 10),
                  timestamp,
                  geCategories: [],
                  department: department.deptCode,
                  courseNumber: course.courseNumber,
                  courseNumeric: (() => {
                    const n = parseInt(course.courseNumber.replace(/\D/g, ""));
                    return isNaN(n) ? 0 : n;
                  })(),
                  courseTitle: course.courseTitle,
                  sectionType:
                    section.sectionType as (typeof sectionTypes)[number],
                  units: section.units,
                  maxCapacity: parseInt(section.maxCapacity, 10),
                  sectionFull:
                    section.status === "FULL" || section.status === "Waitl",
                  waitlistFull: section.status === "FULL",
                  overEnrolled:
                    parseInt(section.numCurrentlyEnrolled.totalEnrolled, 10) >
                    parseInt(section.maxCapacity, 10),
                  cancelled: section.sectionComment.includes(
                    "***  CANCELLED  ***"
                  ),
                  data: isolateSection({ school, department, course, section }),
                },
              };
            }
          }
        }
      }
    }
    for (const [geCategory, response] of Object.entries(data.ge)) {
      for (const school of response.schools) {
        for (const department of school.departments) {
          for (const course of department.courses) {
            for (const section of course.sections) {
              if (res[`${term} ${section.sectionCode}`]) {
                res[`${term} ${section.sectionCode}`].data.geCategories.push(
                  geCategory as GE
                );
              }
            }
          }
        }
      }
    }
  }
  logger.info(`Processed ${Object.keys(res).length} sections`);
  const sectionsCreated = await prisma.websocSection.createMany({
    data: Object.values(res).map((d) => d.data),
  });
  logger.info(`Inserted ${sectionsCreated.count} sections`);
  const instructorsCreated = await prisma.websocSectionInstructor.createMany({
    data: Object.values(res).flatMap((d) => d.meta.instructors),
  });
  logger.info(`Inserted ${instructorsCreated.count} instructors`);
  const meetingsCreated = await prisma.websocSectionMeeting.createMany({
    data: Object.values(res).flatMap((d) => d.meta.meetings),
  });
  logger.info(`Inserted ${meetingsCreated.count} meetings`);
  const instructorsDeleted = await prisma.websocSectionInstructor.deleteMany({
    where: {
      year: term.year,
      quarter: term.quarter,
      timestamp: { lt: timestamp },
    },
  });
  logger.info(`Removed ${instructorsDeleted.count} instructors`);
  const meetingsDeleted = await prisma.websocSectionMeeting.deleteMany({
    where: {
      year: term.year,
      quarter: term.quarter,
      timestamp: { lt: timestamp },
    },
  });
  logger.info(`Removed ${meetingsDeleted.count} meetings`);
  const sectionsDeleted = await prisma.websocSection.deleteMany({
    where: {
      year: term.year,
      quarter: term.quarter,
      timestamp: { lt: timestamp },
    },
  });
  logger.info(`Removed ${sectionsDeleted.count} sections`);
  logger.info("Sleeping for 5 minutes");
  await sleep(SLEEP_DURATION);
}

/**
 * The entry point of the program.
 */
(async function main() {
  try {
    logger.info("websoc-scraper-v2 daemon starting");
    let now = new Date();
    let termsInScope = await getTermsToScrape(now);
    for (const [name, term] of Object.entries(termsInScope))
      await scrape(name, term);
    for (;;) {
      const curr = new Date();
      // Check the available terms every day and scrape all of them once.
      if (curr.getDate() !== now.getDate()) {
        termsInScope = await getTermsToScrape(curr);
        for (const [name, term] of Object.entries(termsInScope))
          await scrape(name, term);
      }
      now = curr;
      // Check the database for terms to scrape on demand.
      const websocTerms = await prisma.websocTerm.findMany({
        where: { timestamp: { gte: now } },
        select: { year: true, quarter: true },
      });
      const termsOnDemandEntries = websocTerms.map(
        (x) => [`${x.year} ${x.quarter}`, x] as TermEntry
      );
      const termsOnDemand = Object.fromEntries(termsOnDemandEntries);
      let scraped = false;
      for (const [name, term] of Object.entries(termsOnDemand)) {
        if (!(name in termsInScope)) {
          logger.info(`Term ${name} requested but not in scope, skipping`);
          continue;
        }
        scraped = true;
        await scrape(name, term);
      }
      if (!scraped || !Object.keys(termsOnDemand).length) {
        logger.info("No terms to scrape on demand, sleeping for 5 minutes");
        await sleep(SLEEP_DURATION);
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
      logger.error(e.stack);
    } else {
      logger.error(e);
    }
    throw e;
  }
})();
