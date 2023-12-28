import { CoursePreview } from "./courses";

/**
 * An object representing an instructor.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/instructors/{ucinetid}``.
 */
export type Instructor = {
  /**
   * The instructor's UCINetID.
   */
  ucinetid: string;
  /**
   * The full name of the instructor.
   */
  name: string;
  /**
   * The shortened name (or WebSoc name; e.g. ``SHINDLER, M.``) of the instructor.
   */
  shortenedName: string;
  /**
   * The instructor's title.
   */
  title: string;
  /**
   * The instructor's email address.
   */
  email: string;
  /**
   * The department to which the instructor belongs.
   */
  department: string;
  /**
   * The school(s) associated with the instructor.
   */
  schools: string[];
  /**
   * The department(s) related to the instructor.
   */
  relatedDepartments: string[];
  /**
   * Course(s) this instructor has taught in the past.
   * Keys are properly spaced course numbers; values are the term(s) in which
   * the instructor taught the corresponding course.
   */
  courseHistory: Record<string, string[]>;
  /**
   *
   */
  courses: CoursePreview[];
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/instructors/all``.
 */
export type Instructors = Instructor[];

export type InstructorPreview = Pick<Instructor, "ucinetid" | "name" | "shortenedName">;
