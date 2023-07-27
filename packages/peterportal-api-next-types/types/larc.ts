/**
 * The course info for the set of LARC sections.
 */
export type LarcCourseInfo = {
  /**
   * The course number.
   */
  courseNumber: string;
  /**
   * The course number that the number above is the same as, if any.
   */
  sameAs?: string;
  /**
   * The name of the course.
   */
  courseName: string;
};

/**
 * One of the LARC sections for a course.
 */
export type LarcSection = {
  /**
   * The days the section will meet.
   */
  days: string;
  /**
   * The time at which the section will meet.
   */
  time: string;
  /**
   * The instructor of the section.
   */
  instructor: string;
  /**
   * The classroom where the section will meet.
   */
  bldg: string;
};

/**
 * A set of LARC sections for a single course.
 */
export type LarcCourse = {
  /**
   * The course info for the set of LARC sections.
   */
  courseInfo: LarcCourseInfo;
  /**
   * The sections associated with this set.
   */
  sections: LarcSection[];
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/larc``.
 */
export type LarcResponse = LarcCourse[];
