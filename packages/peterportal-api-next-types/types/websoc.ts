import { DayOfWeek, Quarter } from "./constants";

/**
 * A type that represents the hour and minute parts of a time.
 */
export type HourMinute = {
  /**
   * The hour (0-23).
   */
  hour: number;
  /**
   * The minute (0-59).
   */
  minute: number;
};

/**
 * The meeting information for a section.
 */
export type WebsocSectionMeeting = {
  /**
   * Whether the meeting time is TBA.
   *
   * If this field is `false`, then `days`, `startTime`, and `endTime`
   * are **guaranteed** to be non-null; otherwise, they are **guaranteed** to be null.
   */
  timeIsTBA: boolean;
  /**
   * The classroom(s) the section meets in.
   */
  bldg: string[];
  /**
   * What day(s) the section meets on (e.g. ``MWF``).
   */
  days: string | null;
  /**
   * The time at which the section begins.
   */
  startTime: HourMinute | null;
  /**
   * The time at which the section concludes.
   */
  endTime: HourMinute | null;
};

/**
 * The enrollment statistics for a section.
 */
export type WebsocSectionEnrollment = {
  /**
   * The total number of students enrolled in this section.
   */
  totalEnrolled: string;
  /**
   * The number of students enrolled in the section referred to by this section
   * code, if the section is cross-listed. If the section is not cross-listed,
   * this field is the empty string.
   */
  sectionEnrolled: string;
};

/**
 * The final exam data for a section.
 */
export type WebsocSectionFinalExam = {
  /**
   * The status of the exam.
   *
   * If this field is `SCHEDULED_FINAL`, then all other fields are
   * **guaranteed** to be non-null; otherwise, they are **guaranteed** to be null.
   */
  examStatus: "NO_FINAL" | "TBA_FINAL" | "SCHEDULED_FINAL";
  /**
   * The day of the week in which the final exam takes place.
   */
  dayOfWeek: DayOfWeek | null;
  /**
   * The zero-indexed month (e.g. January = 0) in which the final exam takes place.
   */
  month: number | null;
  /**
   * The day of the month in which the final exam takes place.
   */
  day: number | null;
  /**
   * When the final exam starts.
   */
  startTime: HourMinute | null;
  /**
   * When the final exam ends.
   */
  endTime: HourMinute | null;
  /**
   * Where the final exam takes place.
   */
  bldg: string[] | null;
  /**
   * Whether the final exam takes place in the same location as its parent section.
   */
  sameBldgAsSection: boolean | null;
};

/**
 * A WebSoc section object.
 */
export type WebsocSection = {
  /**
   * The section code.
   */
  sectionCode: string;
  /**
   * The section type (e.g. ``Lec``, ``Dis``, ``Lab``, etc.)
   */
  sectionType: string;
  /**
   * The section number (e.g. ``A1``).
   */
  sectionNum: string;
  /**
   * The number of units afforded by taking this section.
   */
  units: string;
  /**
   * The name(s) of the instructor(s) teaching this section.
   */
  instructors: string[];
  /**
   * The meeting time(s) of this section.
   */
  meetings: WebsocSectionMeeting[];
  /**
   * The details for the final exam for this section.
   */
  finalExam: WebsocSectionFinalExam;
  /**
   * The maximum capacity of this section.
   */
  maxCapacity: string;
  /**
   * The number of students currently enrolled (cross-listed or otherwise) in
   * this section.
   */
  numCurrentlyEnrolled: WebsocSectionEnrollment;
  /**
   * The number of students currently on the waitlist for this section.
   */
  numOnWaitlist: string;
  /**
   * The maximum number of students that can be on the waitlist for this section.
   */
  numWaitlistCap: string;
  /**
   * The number of students who have requested to be enrolled in this section.
   */
  numRequested: string;
  /**
   * The number of seats in this section reserved for new students.
   */
  numNewOnlyReserved: string;
  /**
   * The restriction code(s) for this section.
   */
  restrictions: string;
  /**
   * The enrollment status.
   */
  status: "OPEN" | "Waitl" | "FULL" | "NewOnly";
  /**
   * Any comments for the section.
   */
  sectionComment: string;
};

/**
 * A WebSoc course object.
 */
export type WebsocCourse = {
  /**
   * The code of the department the course belongs to.
   */
  deptCode: string;
  /**
   * The course number.
   */
  courseNumber: string;
  /**
   * The title of the course.
   */
  courseTitle: string;
  /**
   * Any comments for the course.
   */
  courseComment: string;
  /**
   * The link to the WebReg Course Prerequisites page for this course.
   */
  prerequisiteLink: string;
  /**
   * All sections of the course.
   */
  sections: WebsocSection[];
};

/**
 * A WebSoc department object.
 */
export type WebsocDepartment = {
  /**
   * The name of the department.
   */
  deptName: string;
  /**
   * The department code.
   */
  deptCode: string;
  /**
   * Any comments from the department.
   */
  deptComment: string;
  /**
   * All courses of the department.
   */
  courses: WebsocCourse[];
  /**
   * Any comments for section code(s) under the department.
   */
  sectionCodeRangeComments: string[];
  /**
   * Any comments for course number(s) under the department.
   */
  courseNumberRangeComments: string[];
};

/**
 * A WebSoc school object.
 */
export type WebsocSchool = {
  /**
   * The name of the school.
   */
  schoolName: string;
  /**
   * Any comments from the school.
   */
  schoolComment: string;
  /**
   * All departments of the school.
   */
  departments: WebsocDepartment[];
};

/**
 * An object that represents a specific term.
 */
export type Term = {
  /**
   * The year of the term.
   */
  year: string;
  /**
   * The quarter of the term.
   */
  quarter: Quarter;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/websoc``.
 */
export type WebsocAPIResponse = {
  /**
   * All schools matched by the query.
   */
  schools: WebsocSchool[];
};

/**
 * An object that contains information on a department.
 */
export type Department = {
  /**
   * A string containing the department code and name.
   * @example ``COMPSCI: Computer Science``
   */
  deptLabel: string;
  /**
   * The department code.
   */
  deptValue: string;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/websoc/depts``.
 */
export type DepartmentResponse = Department[];

/**
 * An object that contains information on a term.
 */
export type TermData = {
  /**
   * The short name of the term.
   * @example ``2023 Summer1``
   */
  shortName: `${string} ${Quarter}`;
  /**
   * The full name of the term.
   * @example ``2023 Summer Session 1``
   */
  longName: string;
};

/**
 * The type of the payload returned on a successful response from querying
 * ``/v1/rest/websoc/terms``.
 */
export type TermResponse = TermData[];
