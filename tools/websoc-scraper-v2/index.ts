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
 * @returns ``EnhancedSection`` with all deduped, relevant metadata.
 */
function isolateSection(data: EnhancedSection) {
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

  return { school, department, course, section };
}

async function scrape(
  quarterDates: Record<string, QuarterDates>,
  termsToScrape: Term[]
) {
  logger.info(
    `Scraping WebSoc for ${termsToScrape
      .map((term) => Object.values(term).join(" "))
      .join(", ")}`
  );
  const deptCodes = (await getDepts())
    .map((dept) => dept.deptValue)
    .filter((deptValue) => deptValue !== "ALL");
  let inputs: [Term, WebsocAPIOptions][] = termsToScrape.flatMap((term) => [
    ...deptCodes.map(
      (department) => [term, { department }] as [Term, WebsocAPIOptions]
    ),
    ...(Object.keys(geCategories) as GE[]).map(
      (ge) => [term, { ge }] as [Term, WebsocAPIOptions]
    ),
  ]);
  const results: Record<
    string,
    {
      department: Record<string, WebsocAPIResponse>;
      ge: Record<string, WebsocAPIResponse>;
    }
  > = Object.fromEntries(
    termsToScrape.map((term) => [
      `${term.year} ${term.quarter}`,
      { department: {}, ge: {} },
    ])
  );
  let retries = 0;
  for (;;) {
    logger.info(`Attempt ${retries + 1}: `);
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
    if (!inputs.length) break;
    await sleep(1000 * 2 ** retries++);
  }
  const res: Record<
    string,
    {
      meta: {
        instructors: string[];
        meetings: WebsocSectionMeeting[];
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
    }
  > = {};
  const timestamp = new Date();
  for (const [term, data] of Object.entries(results)) {
    for (const response of Object.values(data.department)) {
      for (const school of (response as WebsocAPIResponse).schools) {
        for (const department of school.departments) {
          for (const course of department.courses) {
            for (const section of course.sections) {
              res[`${term} ${section.sectionCode}`] = {
                meta: {
                  instructors: section.instructors,
                  meetings: section.meetings,
                },
                data: {
                  year: term.split(" ")[0],
                  quarter: term.split(" ")[1] as Quarter,
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
                  data: {
                    schools: [
                      isolateSection({ school, department, course, section })
                        .school,
                    ],
                  } as WebsocAPIResponse,
                },
              };
            }
          }
        }
      }
    }
    for (const [geCategory, response] of Object.entries(data.ge)) {
      for (const school of (response as WebsocAPIResponse).schools) {
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
  await prisma.websocSection.createMany({
    data: Object.values(res).map((d) => d.data),
  });
  await prisma.websocSectionInstructor.createMany({
    data: Object.values(res).flatMap((d) =>
      d.meta.instructors.map((name) => ({
        year: d.data.year,
        quarter: d.data.quarter,
        sectionCode: d.data.sectionCode,
        timestamp,
        name,
      }))
    ),
  });
  await prisma.websocSectionMeeting.createMany({
    data: Object.values(res).flatMap((d) =>
      d.meta.meetings.map((m) => ({
        year: d.data.year,
        quarter: d.data.quarter,
        sectionCode: d.data.sectionCode,
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
            const [startTimeHour, startTimeMinute] = startTimeString.split(":");
            startTime =
              parseInt(startTimeHour) * 60 + parseInt(startTimeMinute);
            const [endTimeHour, endTimeMinute] = endTimeString.split(":");
            endTime = parseInt(endTimeHour) * 60 + parseInt(endTimeMinute);
            if (endTimeMinute.includes("p")) {
              startTime += 12 * 60;
              endTime += 12 * 60;
            }
          }
          return { startTime, endTime };
        })(),
      }))
    ),
  });
  await prisma.websocSectionInstructor.deleteMany({
    where: {
      timestamp: {
        lt: timestamp,
      },
    },
  });
  await prisma.websocSectionMeeting.deleteMany({
    where: {
      timestamp: {
        lt: timestamp,
      },
    },
  });
  await prisma.websocSection.deleteMany({
    where: {
      timestamp: {
        lt: timestamp,
      },
    },
  });
}

(async () => {
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
      const scrapingStartedMs = Date.now();
      await scrape(quarterDates, termsToScrape);
      break;
      // const sleepDuration = (5 * 60 * 1000 - (Date.now() - scrapingStartedMs));
      // logger.info(`Sleeping for ${sleepDuration} ms`)
      // await sleep(sleepDuration);
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
