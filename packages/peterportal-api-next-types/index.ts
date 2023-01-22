export type AcademicQuarter = "Fall" | "Winter" | "Spring" | "Summer";

export type CourseLevel =
  | "Lower Division (1-99)"
  | "Upper Division (100-199)"
  | "Graduate/Professional Only (200+)";

export type GECategory =
  | "GE Ia: Lower Division Writing"
  | "GE Ib: Upper Division Writing"
  | "GE II: Science and Technology"
  | "GE III: Social & Behavioral Sciences"
  | "GE IV: Arts and Humanities"
  | "GE Va: Quantitative Literacy"
  | "GE Vb: Formal Reasoning"
  | "GE VI: Language Other Than English"
  | "GE VII: Multicultural Studies"
  | "GE VIII: International/Global Issues";

export interface PrerequisiteTree {
  AND?: string[];
  OR?: string[];
}

export interface Course {
  courseId: string;
  department: string;
  courseNumber: string;
  school: string;
  title: string;
  courseLevel: CourseLevel;
  minUnits: string;
  maxUnits: string;
  description: string;
  departmentName: string;
  instructorHistory: string[];
  prerequisiteTree: PrerequisiteTree;
  prerequisiteList: string[];
  prerequisiteText: string;
  prerequisiteFor: string[];
  repeatability: string;
  gradingOption: string;
  concurrent: string;
  sameAs: string;
  restriction: string;
  overlap: string;
  corequisite: string;
  geList: GECategory[];
  geText: string;
  terms: string[];
}

export interface GradeSection {
  academicYear: string;
  academicQuarter: AcademicQuarter;
  instructor: string;
  type: string;
}

export interface GradeDistribution {
  gradeACount: number;
  gradeBCount: number;
  gradeCCount: number;
  gradeDCount: number;
  gradeFCount: number;
  gradePCount: number;
  gradeNPCount: number;
  gradeWCount: number;
  averageGPA: number;
}

export interface Instructor {
  ucinetid: string;
  instructorName: string;
  shortenedName: string;
  title: string;
  department: string;
  schools: string[];
  relatedDepartments: string[];
  courseHistory: string[];
}

export interface WebsocSectionMeeting {
  days: string;
  time: string;
  bldg: string;
}

export interface WebsocSectionEnrollment {
  totalEnrolled: string;
  sectionEnrolled: string;
}

export interface WebsocSection {
  sectionCode: string;
  sectionType: string;
  sectionNum: string;
  units: string;
  instructors: string[];
  meetings: WebsocSectionMeeting[];
  finalExam: string;
  maxCapacity: string;
  numCurrentlyEnrolled: WebsocSectionEnrollment;
  numOnWaitlist: string;
  numRequested: string;
  numNewOnlyReserved: string;
  restrictions: string;
  status: string;
  sectionComment: string;
}

export interface WebsocCourse {
  deptCode: string;
  courseNumber: string;
  courseTitle: string;
  courseComment: string;
  prerequisiteLink: string;
  sections: WebsocSection[];
}

export interface WebsocDepartment {
  deptName: string;
  deptCode: string;
  deptComment: string;
  courses: WebsocCourse[];
  sectionCodeRangeComments: string[];
  courseNumberRangeComments: string[];
}

export interface WebsocSchool {
  schoolName: string;
  schoolComment: string;
  departments: WebsocDepartment[];
}

export interface IResponse {
  timestamp: string;
  requestId: string;
  statusCode: number;
  payload?: unknown;
  error?: unknown;
  message?: unknown;
}

export interface Response<T> extends IResponse {
  payload: T;
}

export type CourseResponse = Response<Course>;

export type CoursesAllResponse = Response<Course[]>;

export type InstructorResponse = Response<Instructor>;

export type InstructorsAllResponse = Response<Instructor[]>;

export type GradesRawResponse = Response<(GradeSection & GradeDistribution)[]>;

export type GradesCalculatedResponse = Response<{
  gradeDistribution: GradeDistribution & { count: number };
  courseList: GradeSection[];
}>;

export type WebsocResponse = Response<WebsocSchool[]>;

export interface ErrorResponse extends IResponse {
  error: string;
  message: string;
}

export function isErrorResponse(r: IResponse): r is ErrorResponse {
  return typeof r?.error === "string" && typeof r?.message === "string";
}
