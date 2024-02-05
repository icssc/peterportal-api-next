import type { WebsocEnrollmentHistory, WebsocEnrollmentHistoryEntry } from "@libs/db";
import type { EnrollmentHistory, Meeting } from "@peterportal-api/types";

const stringifyDate = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
export const transformResults = (
  results: Array<WebsocEnrollmentHistory & { entries: WebsocEnrollmentHistoryEntry[] }>,
): EnrollmentHistory[] =>
  results.map(({ entries, ...x }) => ({
    ...x,
    sectionCode: x.sectionCode.toString().padStart(5, "0"),
    meetings: x.meetings as Meeting[],
    dates: entries.map((y) => y.date).map(stringifyDate),
    maxCapacityHistory: entries.map((y) => y.maxCapacity),
    totalEnrolledHistory: entries.map((y) => y.totalEnrolled),
    waitlistHistory: entries.map((y) => y.waitlist),
    waitlistCapHistory: entries.map((y) => y.waitlistCap),
    requestedHistory: entries.map((y) => y.requested),
    newOnlyReservedHistory: entries.map((y) => y.newOnlyReserved),
    statusHistory: entries.map((y) => y.status),
  }));
