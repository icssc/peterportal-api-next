import { Quarter } from "./constants";

/**
 * A section which has grades data associated with it.
 */
export type GradeSection = {
  /**
   * The year the section was offered.
   */
  year: string;
  /**
   * The quarter the section was offered.
   */
  quarter: Quarter;
  /**
   * The department code.
   */
  department: string;
  /**
   * The course number the section belongs to.
   */
  courseNumber: string;
  /**
   * The numeric part of the course number.
   */
  courseNumeric: number;
  /**
   * The section code of the section.
   */
  sectionCode: string;
  /**
   * The shortened name(s) of the instructor(s) who taught the section.
   */
  instructors: string[];
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
 * An object that represents aggregate grades statistics for a given query.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/aggregate``.
 * @alpha
 */
export type GradesAggregate = {
  /**
   * The list of sections in the query.
   */
  sectionList: GradeSection[];
  /**
   * The combined grades distribution of all sections in the query.
   */
  gradeDistribution: GradeDistribution;
};

export type GradesOptions = {
  years: string[];
  departments: string[];
  courseNumbers: string[];
  sectionCodes: string[];
  instructors: string[];
};
