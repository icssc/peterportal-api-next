/**
 * An object that represents the week that the specified day is in.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/week``.
 * @alpha
 */
export type WeekData = {
  /**
   * The week number(s) of the term.
   */
  weeks: number[];
  /**
   * The name of the term(s) the week is in.
   */
  quarters: string[];
  /**
   * The display string for the given week.
   */
  display: string;
};
