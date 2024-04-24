import type { Quarter } from "./constants";

/**
 * An object that includes important dates for a specified quarter.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/calendar``.
 */
export type QuarterDates = {
  /**
   * The year of the given term.
   */
  year: string;
  /**
   * The quarter of the given term.
   */
  quarter: Quarter;
  /**
   * When instruction begins for the given term.
   */
  instructionStart: Date;
  /**
   * When instruction ends for the given term.
   */
  instructionEnd: Date;
  /**
   * When finals begin for the given term.
   */
  finalsStart: Date;
  /**
   * When finals end for the given term.
   */
  finalsEnd: Date;
  /**
   * When the Schedule of Classes becomes available for the given term.
   */
  socAvailable: Date;
};
