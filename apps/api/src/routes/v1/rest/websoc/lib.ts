import type { Prisma } from "@libs/db";
import type { WebsocAPIOptions } from "@libs/uc-irvine-api/websoc";
import { notNull } from "@libs/utils";

import type { Query } from "./schema";

/**
 * type guard that asserts that the settled promise was fulfilled
 */
export const fulfilled = <T>(value: PromiseSettledResult<T>): value is PromiseFulfilledResult<T> =>
  value.status === "fulfilled";

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
        array_contains: [parsedQuery.ge],
      },
    });
  }

  if (parsedQuery.department) {
    AND.push({ department: parsedQuery.department.toUpperCase() });
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
          : { courseNumber: n.toUpperCase() },
      ),
    );
  }

  if (parsedQuery.instructorName) {
    AND.push({
      instructors: {
        every: {
          name: {
            contains: parsedQuery.instructorName,
            mode: "insensitive",
          },
        },
      },
    });
  }

  if (parsedQuery.courseTitle) {
    AND.push({
      courseTitle: {
        contains: parsedQuery.courseTitle,
        mode: "insensitive",
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
                array_contains: [x],
              },
            },
          },
        })),
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
                ? `${parsedQuery.building.toUpperCase()} ${parsedQuery.room.toUpperCase()}`
                : { contains: parsedQuery.building, mode: "insensitive" },
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
      })),
    );
  }

  if (parsedQuery.units) {
    OR.push(
      ...parsedQuery.units.map((u) => ({
        units: u === "VAR" ? { contains: "-" } : { startsWith: parseFloat(u).toString() },
      })),
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

  if (query.units?.length) {
    queries = query.units.flatMap((units) => queries.map((q) => ({ ...q, units })));
  }

  if (query.sectionCodes?.length) {
    queries = query.sectionCodes
      .map((_, i) => (i % 5 === 0 ? i : null))
      .filter(notNull)
      .flatMap((k) =>
        queries.map((q) => ({
          ...q,
          sectionCodes: query.sectionCodes?.slice(k, k + 5).join(",") || "",
        })),
      );
  }
  return queries;
}
