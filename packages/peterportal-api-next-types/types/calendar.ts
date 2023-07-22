/**
 * An object that includes important dates for a specified quarter.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/calendar``.
 */
export type QuarterDates = {
  /**
   * When instruction begins for the given quarter.
   */
  instructionStart: string;
  /**
   * When instruction ends for the given quarter.
   */
  instructionEnd: string;
  /**
   * When finals begin for the given quarter.
   */
  finalsStart: string;
  /**
   * When finals end for the given quarter.
   */
  finalsEnd: string;
};
