import { CourseLevel, GECategory } from "./constants";

/**
 * An object representing a course prerequisite.
 */
export type PrereqCourse = {
  /**
   * The course ID of this course.
   */
  courseId: string;
  /**
   * The minimum grade required for this course.
   */
  minGrade?: string;
  /**
   * If course is a corequisite.
   */
  coreq?: boolean;
}

/**
 * An object representing a prerequisite tree for a course.
 */
export type PrerequisiteTree = {
  /**
   * All of these courses must have been taken before this course can be taken.
   */
  AND?: Array<PrereqCourse | PrerequisiteTree>;
  /**
   * One of these courses must have been taken before this course can be taken.
   */
  OR?: Array<PrereqCourse | PrerequisiteTree>;
  /**
   * These courses must not have been taken before this course can be taken.
   */
  NOT?: Array<PrereqCourse | PrerequisiteTree>;
};

/**
 * An object that represents a course.
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/courses/{courseId}``.
 * @alpha
 */
export type Course = {
  /**
   * The course ID.
   */
  id: string;
  /**
   * The department code that the course belongs to.
   */
  department: string;
  /**
   * The course number of the course.
   */
  courseNumber: string;
  /**
   * The numeric part of the course number.
   */
  courseNumeric: number;
  /**
   * The school that the course belongs to.
   */
  school: string;
  /**
   * The title of the course.
   */
  title: string;
  /**
   * The level of the course.
   */
  courseLevel: CourseLevel;
  /**
   * The minimum number of units that can be earned by taking the course.
   */
  minUnits: number;
  /**
   * The maximum number of units that can be earned by taking the course.
   */
  maxUnits: number;
  /**
   * The course description.
   */
  description: string;
  /**
   * The name of the department that the course belongs to.
   */
  departmentName: string;
  /**
   * The UCINetIDs of all instructors who have taught this course in the past.
   */
  instructorHistory: string[];
  /**
   * The prerequisite tree object for the course.
   */
  prerequisiteTree: PrerequisiteTree;
  /**
   * The list of prerequisites for the course.
   */
  prerequisiteList: string[];
  /**
   * The catalogue's prerequisite text for the course.
   */
  prerequisiteText: string;
  /**
   * The courses for which this course is a prerequisite.
   */
  prerequisiteFor: string[];
  /**
   * The repeat policy for this course.
   */
  repeatability: string;
  /**
   * The grading option(s) available for this course.
   */
  gradingOption: string;
  /**
   * The course(s) with which this course is concurrent.
   */
  concurrent: string;
  /**
   * The course(s) that are the same as this course.
   */
  sameAs: string;
  /**
   * The enrollment restriction(s) placed on this course.
   */
  restriction: string;
  /**
   * The course(s) with which this course overlaps.
   */
  overlap: string;
  /**
   * The corequisites for this course.
   */
  corequisites: string;
  /**
   * The list of GE categories that this course fulfills.
   */
  geList: GECategory[];
  /**
   * The catalogue's GE text for this course.
   */
  geText: string;
  /**
   * The list of terms in which this course was offered.
   */
  terms: string[];
};
