/**
 * An object representing an instructor.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/instructors/{ucinetid}``.
 * @alpha
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
   * Course(s) this instructor has taught in the past and the associated Quarter/Year.
   */
  courseHistory: Record<string, string[]>;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/instructors``.
 * @alpha
 */
export type Instructors = Instructor[];
