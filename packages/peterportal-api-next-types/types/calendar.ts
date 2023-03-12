import { Quarter } from "./constants";

/**
 * An object that represents the week that the specified day is in.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/calendar/week``.
 * @alpha
 */
export type WeekData = {
  /**
   * The week number.
   */
  week: string;
  /**
   * The short name of the quarter the week is in.
   */
  quarter: `${string} ${Quarter}`;
  /**
   * The display string for the given week.
   */
  display: string;
};

/**
 * An object that includes important dates for a specified quarter.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/calendar/quarter``.
 * @alpha
 */
export type QuarterDates = {
  /**
   * When the Schedule of Classes is available for the given quarter.
   */
  scheduleAvailable: Date;
  /**
   * When enrollment begins for the given quarter.
   */
  enrollmentStart: Date;
  /**
   * When instruction begins for the given quarter.
   */
  instructionStart: Date;
  /**
   * When unrestricted enrollment ends for the given quarter.
   * After this date, adding/changing/dropping courses require deans' approval.
   */
  unrestrictedEnrollmentEnd: Date;
  /**
   * When ALL enrollment ends for the given quarter.
   * After this date, no enrollment changes can be made at all.
   */
  enrollmentEnd: Date;
  /**
   * When instruction ends for the given quarter.
   */
  instructionEnd: Date;
  /**
   * When finals begin for the given quarter.
   */
  finalsStart: Date;
  /**
   * When finals end for the given quarter.
   */
  finalsEnd: Date;
};
