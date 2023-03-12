import { PrismaClient } from "db";
import type {
  GE,
  QuarterDates,
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
} from "peterportal-api-next-types";
import {
  geCategories,
  Quarter,
  sectionTypes,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";
import { getTermDateData } from "registrar-api";
import {
  type WebsocAPIOptions,
  callWebSocAPI,
  getDepts,
  getTerms,
} from "websoc-api-next";
import { createLogger, format, transports } from "winston";

/**
 * Section that also contains all relevant WebSoc metadata.
 */
type EnhancedSection = {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
};

type ScrapedTerm = {
  department: Record<string, WebsocAPIResponse>;
  ge: Record<string, WebsocAPIResponse>;
};

type ProcessedInstructor = {
  year: string;
  quarter: Quarter;
  sectionCode: number;
  timestamp: Date;
  name: string;
};

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

type ProcessedSection = {
  meta: {
    instructors: ProcessedInstructor[];
    meetings: ProcessedMeeting[];
  };
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

async function getQuarterDates(
  date: Date
): Promise<Record<string, QuarterDates>> {
  return Object.assign(
    {},
    ...(await Promise.all(
      Array.from(Array(3).keys()).map((x) =>
        getTermDateData((x + date.getFullYear() - 1).toString())
      )
    ))
  );
}

async function getTermsToScrape(
  date: Date,
  quarterDates: Record<string, QuarterDates>
) {
  return (await getTerms())
    .map((term) => term.shortName)
    .filter((term) => Object.keys(quarterDates).includes(term))
    .filter((term) => date <= quarterDates[term].finalsStart)
    .map(
      (term) =>
        ({ year: term.split(" ")[0], quarter: term.split(" ")[1] } as Term)
    );
}

const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

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

async function scrape(
  quarterDates: Record<string, QuarterDates>,
  termsToScrape: Term[]
) {
  const deptCodes = (await getDepts())
    .map((dept) => dept.deptValue)
    .filter((deptValue) => deptValue !== "ALL");
  const results: Record<string, ScrapedTerm> = Object.fromEntries(
    termsToScrape.map((term) => [
      `${term.year} ${term.quarter}`,
      { department: {}, ge: {} },
    ])
  );
  let inputs: [Term, WebsocAPIOptions][] = termsToScrape.flatMap((term) => [
    ...deptCodes.map(
      (department) => [term, { department }] as [Term, WebsocAPIOptions]
    ),
    ...(Object.keys(geCategories) as GE[]).map(
      (ge) => [term, { ge }] as [Term, WebsocAPIOptions]
    ),
  ]);
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
  const timestamp = new Date();
  logger.info("Processing all sections");
  for (const [term, data] of Object.entries(results)) {
    for (const response of Object.values(data.department)) {
      for (const school of response.schools) {
        for (const department of school.departments) {
          for (const course of department.courses) {
            for (const section of course.sections) {
              const [year, q] = term.split(" ");
              const sectionCode = parseInt(section.sectionCode);
              res[`${term} ${section.sectionCode}`] = {
                meta: {
                  instructors: section.instructors.map((name) => ({
                    year,
                    quarter: q as Quarter,
                    sectionCode,
                    timestamp,
                    name,
                  })),
                  meetings: section.meetings.map((m) => ({
                    year,
                    quarter: q as Quarter,
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
                  quarter: q as Quarter,
                  sectionCode: parseInt(section.sectionCode),
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
                  maxCapacity: parseInt(section.maxCapacity),
                  sectionFull:
                    section.status === "FULL" || section.status === "Waitl",
                  waitlistFull: section.status === "FULL",
                  overEnrolled:
                    parseInt(section.numCurrentlyEnrolled.totalEnrolled) >
                    parseInt(section.maxCapacity),
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
    where: { timestamp: { lt: timestamp } },
  });
  logger.info(`Removed ${instructorsDeleted.count} instructors`);
  const meetingsDeleted = await prisma.websocSectionMeeting.deleteMany({
    where: { timestamp: { lt: timestamp } },
  });
  logger.info(`Removed ${meetingsDeleted.count} meetings`);
  const sectionsDeleted = await prisma.websocSection.deleteMany({
    where: { timestamp: { lt: timestamp } },
  });
  logger.info(`Removed ${sectionsDeleted.count} sections`);
}

/**
 * The entry point of the program.
 */
(async function main() {
  try {
    logger.info("websoc-scraper-v2 daemon starting");
    let now = new Date();
    // Get quarter date data for the current calendar year and the years
    // immediately before and after it.
    let quarterDates = await getQuarterDates(now);
    let termsToScrape = await getTermsToScrape(now, quarterDates);
    for (;;) {
      const curr = new Date();
      // Fetch the quarter dates again when the calendar year changes.
      if (curr.getFullYear() > now.getFullYear()) {
        quarterDates = await getQuarterDates(curr);
      }
      // Check the available terms every day.
      if (curr.getDate() > now.getDate() || curr.getDate() === 1) {
        termsToScrape = await getTermsToScrape(curr, quarterDates);
      }
      now = curr;
      logger.info(
        `Scraping WebSoc for ${termsToScrape
          .map((term) => Object.values(term).join(" "))
          .join(", ")}`
      );
      await scrape(quarterDates, termsToScrape);
      // break;
      logger.info("Sleeping for 15 minutes");
      await sleep(15 * 60 * 1000);
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
