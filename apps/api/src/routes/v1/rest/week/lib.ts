import type { CalendarTerm } from "@libs/db";
import type { Quarter } from "@peterportal-api/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FALL_OFFSET_MS = 4 * DAY_MS;

export const getWeek = (date: Date, term: CalendarTerm): number =>
  Math.floor(
    (date.valueOf() -
      (term.instructionStart.valueOf() + (term.quarter === "Fall" ? FALL_OFFSET_MS : 0))) /
      WEEK_MS,
  ) + 1;

export const getQuarter = (year: string, quarter: Quarter): string => {
  switch (quarter) {
    case "Summer1":
      return `Summer Session I ${year}`;
    case "Summer2":
      return `Summer Session II ${year}`;
    case "Summer10wk":
      return `Summer Session 10WK ${year}`;
    default:
      return `${quarter} Quarter ${year}`;
  }
};
