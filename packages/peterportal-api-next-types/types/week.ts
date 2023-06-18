import { Quarter } from "./constants";
/**
 * An object that represents the week that the specified day is in.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/week``.
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
