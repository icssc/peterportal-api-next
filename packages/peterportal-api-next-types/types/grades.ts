import { Quarter } from "./constants";

/**
 * A section which has grades data associated with it.
 */
export type GradeSection = {
  /**
   * What year the section was offered.
   */
  year: string;
  /**
   * What quarter the section was offered.
   */
  quarter: Quarter;
  /**
   * The shortened name of the instructor who taught the section.
   */
  instructor: string;
  /**
   * The type (e.g. ``LEC``) of the section.
   */
  type: string;
};

/**
 * The distribution of grades within a section or among all queried sections.
 */
export type GradeDistribution = {
  /**
   * How many students attained an A+/A/A-.
   */
  gradeACount: number;
  /**
   * How many students attained a B+/B/B-.
   */
  gradeBCount: number;
  /**
   * How many students attained a C+/C/C-.
   */
  gradeCCount: number;
  /**
   * How many students attained a D+/D/D-.
   */
  gradeDCount: number;
  /**
   * How many students attained an F.
   */
  gradeFCount: number;
  /**
   * How many students attained a P.
   */
  gradePCount: number;
  /**
   * How many students attained an NP.
   */
  gradeNPCount: number;
  /**
   * How many students attained a W.
   */
  gradeWCount: number;
  /**
   * The average GPA of all assigned grades in the object.
   */
  averageGPA: number;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/raw``.
 * @alpha
 */
export type GradesRaw = (GradeSection & GradeDistribution)[];

/**
 * An object that represents calculated grades statistics for a given query.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/calculated``.
 * @alpha
 */
export type GradesCalculated = {
  /**
   * The list of sections in the query.
   */
  sectionList: GradeSection[];
  /**
   * The combined grades distribution of all sections in the query.
   */
  gradeDistribution: GradeDistribution;
};
