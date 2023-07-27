/**
 * An object that represents the week that the specified day is in.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/week``.
 */
export type WeekData = {
  /**
   * The week number(s) of the term(s) in session.
   * If a term is in finals, then that term's week number will be -1.
   * If there are no terms in session, then this will be equal to `[-1]`.
   */
  weeks: number[];
  /**
   * The name of the term(s) the week is in.
   * If there are no terms in session, then this will be equal to `["N/A"]`.
   */
  quarters: string[];
  /**
   * The display string for the given week.
   */
  display: string;
};
