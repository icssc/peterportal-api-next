import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Prisma } from "@libs/db";
import { WebsocAPIOptions } from "@libs/websoc-api-next";
import type {
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";

import type { Query } from "./schema";

/**
 * Section that also contains all relevant Websoc metadata.
 */
type EnhancedSection = {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
};

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
const lexOrd = (a: string, b: string): number => (a === b ? 0 : a > b ? 1 : -1);

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
 * type guard that asserts that the settled promise was fulfilled
 */
export const fulfilled = <T>(value: PromiseSettledResult<T>): value is PromiseFulfilledResult<T> =>
  value.status === "fulfilled";

/**
 * type guard that asserts input is defined
 */
export const notNull = <T>(x: T): x is NonNullable<T> => x != null;

/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
export const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

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

/**
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
export function combineResponses(...responses: WebsocAPIResponse[]): WebsocAPIResponse {
  const allSections = responses.flatMap((response) =>
    response.schools.flatMap((school) =>
      school.departments.flatMap((department) =>
        department.courses.flatMap((course) =>
          course.sections.map((section) => isolateSection({ school, department, course, section }))
        )
      )
    )
  );

  /**
   * for each section:
   * if one of its parent structures hasn't been declared,
   * append the corresponding structure of the section
   */
  const schools = allSections.reduce((acc, section) => {
    const foundSchool = acc.find((s) => s.schoolName === section.school.schoolName);
    if (!foundSchool) {
      acc.push(section.school);
      return acc;
    }

    const foundDept = foundSchool.departments.find(
      (d) => d.deptCode === section.department.deptCode
    );
    if (!foundDept) {
      foundSchool.departments.push(section.department);
      return acc;
    }

    const foundCourse = foundDept.courses.find(
      (c) =>
        c.courseNumber === section.course.courseNumber &&
        c.courseTitle === section.course.courseTitle
    );
    if (!foundCourse) {
      foundDept.courses.push(section.course);
      return acc;
    }

    const foundSection = foundCourse.sections.find(
      (s) => s.sectionCode === section.section.sectionCode
    );
    if (!foundSection) {
      foundCourse.sections.push(section.section);
      return acc;
    }

    return acc;
  }, [] as WebsocSchool[]);

  return { schools };
}

/**
 * Converts a 12-hour time string into number of minutes since midnight.
 * @param time The time string to parse.
 */
function minutesSinceMidnight(time: string): number {
  const [hour, minute] = time.split(":");
  return (parseInt(hour, 10) % 12) * 60 + parseInt(minute, 10) + (minute.includes("pm") ? 720 : 0);
}

/**
 * Constructs a Prisma query for the given filter parameters.
 * @param parsedQuery The query object parsed by Zod.
 */
export function constructPrismaQuery(parsedQuery: Query): Prisma.WebsocSectionWhereInput {
  const AND: Prisma.WebsocSectionWhereInput[] = [
    { year: parsedQuery.year },
    { quarter: parsedQuery.quarter },
  ];

  const OR: Prisma.WebsocSectionWhereInput[] = [];

  if (parsedQuery.ge && parsedQuery.ge !== "ANY") {
    AND.push({
      geCategories: {
        array_contains: parsedQuery.ge,
      },
    });
  }

  if (parsedQuery.department) {
    AND.push({ department: parsedQuery.department });
  }

  if (parsedQuery.courseNumber) {
    OR.push(
      ...parsedQuery.courseNumber.map((n) =>
        n.includes("-")
          ? {
              courseNumeric: {
                gte: parseInt(n.split("-")[0].replace(/\D/g, "")),
                lte: parseInt(n.split("-")[1].replace(/\D/g, "")),
              },
            }
          : { courseNumber: n }
      )
    );
  }

  if (parsedQuery.instructorName) {
    AND.push({
      instructors: {
        every: {
          name: {
            contains: parsedQuery.instructorName,
          },
        },
      },
    });
  }

  if (parsedQuery.courseTitle) {
    AND.push({
      courseTitle: {
        contains: parsedQuery.courseTitle,
      },
    });
  }

  if (parsedQuery.sectionType && parsedQuery.sectionType !== "ANY") {
    AND.push({ sectionType: parsedQuery.sectionType });
  }

  if (parsedQuery.startTime) {
    AND.push({
      meetings: {
        every: {
          startTime: {
            gte: minutesSinceMidnight(parsedQuery.startTime),
          },
        },
      },
    });
  }

  if (parsedQuery.endTime) {
    AND.push({
      meetings: {
        every: {
          endTime: {
            gte: 0,
            lte: minutesSinceMidnight(parsedQuery.endTime),
          },
        },
      },
    });
  }

  if (parsedQuery.division && parsedQuery.division !== "ANY") {
    switch (parsedQuery.division) {
      case "Graduate":
        AND.push({ courseNumeric: { gte: 200 } });
        break;
      case "UpperDiv":
        AND.push({ courseNumeric: { gte: 100, lte: 199 } });
        break;
      case "LowerDiv":
        AND.push({ courseNumeric: { gte: 0, lte: 99 } });
    }
  }

  if (parsedQuery.days) {
    AND.push(
      ...["Su", "M", "Tu", "W", "Th", "F", "Sa"]
        .filter((x) => parsedQuery.days?.includes(x))
        .map((x) => ({
          meetings: {
            every: {
              days: {
                array_contains: x,
              },
            },
          },
        }))
    );
  }

  if (parsedQuery.fullCourses && parsedQuery.fullCourses !== "ANY") {
    switch (parsedQuery.fullCourses) {
      case "FullOnly":
        AND.push({ sectionFull: true, waitlistFull: true });
        break;
      case "OverEnrolled":
        AND.push({ overEnrolled: true });
        break;
      case "SkipFull":
        AND.push({ sectionFull: true, waitlistFull: false });
        break;
      case "SkipFullWaitlist":
        AND.push({ sectionFull: false, waitlistFull: false });
    }
  }

  switch (parsedQuery.cancelledCourses) {
    case undefined:
      AND.push({ cancelled: false });
      break;
    case "Exclude":
      AND.push({ cancelled: false });
      break;
    case "Only":
      AND.push({ cancelled: true });
  }

  if (parsedQuery.building) {
    AND.push({
      meetings: {
        every: {
          buildings: {
            some: {
              bldg: parsedQuery.room
                ? `${parsedQuery.building} ${parsedQuery.room}`
                : { contains: parsedQuery.building },
            },
          },
        },
      },
    });
  }

  if (parsedQuery.sectionCodes) {
    OR.push(
      ...parsedQuery.sectionCodes.map((code) => ({
        sectionCode: code.includes("-")
          ? {
              gte: parseInt(code.split("-")[0], 10),
              lte: parseInt(code.split("-")[1], 10),
            }
          : parseInt(code),
      }))
    );
  }

  if (parsedQuery.units) {
    OR.push(
      ...parsedQuery.units.map((u) => ({
        units: u === "VAR" ? { contains: "-" } : { startsWith: parseFloat(u).toString() },
      }))
    );
  }

  return {
    AND,

    /**
     * if OR non-empty, then use it; otherwise undefined means "ignore this field"
     */
    OR: OR.length ? OR : undefined,
  };
}

/**
 * Normalize a parsed query into array of objects that can be passed to ``callWebSocAPI``.
 *
 * To support batch queries for ``units`` and ``sectionCodes``,
 * copies of the normalized query are created for every ``units``
 * argument specified and for every 5 ``sectionCodes`` argument specified.
 * @param query Zod-parsed query object.
 */
export function normalizeQuery(query: Query): WebsocAPIOptions[] {
  const {
    units: _units,
    sectionCodes: _sectionCodes,
    ...baseQuery
  } = {
    ...query,
    instructorName: query.instructorName ?? "",
    sectionCodes: query.sectionCodes?.join(","),
    building: query.building ?? "",
    room: query.room ?? "",
    courseNumber: query.courseNumber?.join(","),
    days: query.days?.join(""),
  };

  let queries: WebsocAPIOptions[] = [baseQuery];
  if (query.units?.length)
    queries = query.units.flatMap((units) => queries.map((q) => ({ ...q, units })));
  if (query.sectionCodes?.length)
    queries = query.sectionCodes
      .map((_, i) => (i % 5 === 0 ? i : null))
      .filter(notNull)
      .flatMap((k) =>
        queries.map((q) => ({
          ...q,
          sectionCodes: query.sectionCodes?.slice(k, k + 5).join(",") || "",
        }))
      );
  return queries;
}

/**
 * Deeply sorts the provided response and returns the sorted response.
 *
 * Schools are sorted in lexicographical order of their name, departments are
 * sorted in lexicographical order of their code, courses are sorted in
 * numerical order of their number (with lexicographical tiebreaks),
 * and sections are sorted in numerical order of their code.
 * @param response The response to sort.
 */
export function sortResponse(response: WebsocAPIResponse): WebsocAPIResponse {
  response.schools.forEach((schools) => {
    schools.departments.forEach((department) => {
      department.courses.forEach((course) =>
        course.sections.sort((a, b) => parseInt(a.sectionCode, 10) - parseInt(b.sectionCode, 10))
      );
      department.courses.sort((a, b) => {
        const numOrd =
          parseInt(a.courseNumber.replace(/\D/g, ""), 10) -
          parseInt(b.courseNumber.replace(/\D/g, ""), 10);
        return numOrd ? numOrd : lexOrd(a.courseNumber, b.courseNumber);
      });
    });
    schools.departments.sort((a, b) => lexOrd(a.deptCode, b.deptCode));
  });
  response.schools.sort((a, b) => lexOrd(a.schoolName, b.schoolName));
  return response;
}

/**
 * Wraps the Lambda client to invoke the WebSoc proxy service.
 * @param client The Lambda Client to use.
 * @param body The body to send to the proxy service.
 */
export async function invokeProxyService(
  client: LambdaClient,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await client.send(
    new InvokeCommand({
      FunctionName: "peterportal-api-next-prod-websoc-proxy-service",
      Payload: new TextEncoder().encode(JSON.stringify({ body: JSON.stringify(body) })),
    })
  );
  const payload = JSON.parse(Buffer.from(res.Payload ?? []).toString());
  console.log(payload.body);
  return JSON.parse(payload.body);
}
