import type { GE, Quarter } from "./constants";

/**
 * A section which has grades data associated with it.
 */
export type GradesSection = {
  /**
   * The year the section was offered.
   */
  year: string;
  /**
   * The quarter the section was offered.
   */
  quarter: Quarter;
  /**
   * The section code of the section.
   */
  sectionCode: string;
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
   * What GE categor(y/ies) the section fulfills (if any).
   */
  geCategories: GE[];
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

export type RawGrade = GradesSection & GradeDistribution;

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/raw``.
 */
export type RawGrades = RawGrade[];

/**
 * An object that represents aggregate grades statistics for a given query.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/aggregate``.
 */
export type AggregateGrades = {
  /**
   * The list of sections in the query.
   */
  sectionList: GradesSection[];
  /**
   * The combined grades distribution of all sections in the query.
   */
  gradeDistribution: GradeDistribution;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/grades/options``.
 */
export type GradesOptions = {
  /**
   * The list of years that matched the given filters.
   */
  years: string[];
  /**
   * The list of departments that matched the given filters.
   */
  departments: string[];
  /**
   * The list of course numbers that matched the given filters.
   */
  courseNumbers: string[];
  /**
   * The list of section codes that matched the given filters.
   */
  sectionCodes: string[];
  /**
   * The list of instructors that matched the given filters.
   */
  instructors: string[];
};

export type AggregateGradeByCourseHeader = {
  department: string;
  courseNumber: string;
};

export type AggregateGradeByCourse = AggregateGradeByCourseHeader & GradeDistribution;

export type AggregateGradesByCourse = AggregateGradeByCourse[];

export type AggregateGradeByOfferingHeader = {
  department: string;
  courseNumber: string;
  instructor: string;
};

export type AggregateGradeByOffering = AggregateGradeByOfferingHeader & GradeDistribution;

export type AggregateGradesByOffering = AggregateGradeByOffering[];
