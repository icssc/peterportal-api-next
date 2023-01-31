/* region Constants */

const quarters = [
  "Fall",
  "Winter",
  "Spring",
  "Summer1",
  "Summer10wk",
  "Summer2",
] as const;
const websocGECategories = [
  "GE-1A",
  "GE-1B",
  "GE-2",
  "GE-3",
  "GE-4",
  "GE-5A",
  "GE-5B",
  "GE-6",
  "GE-7",
  "GE-8",
] as const;
const divisions = ["LowerDiv", "UpperDiv", "Graduate"] as const;
const sectionTypes = [
  "Act",
  "Col",
  "Dis",
  "Fld",
  "Lab",
  "Lec",
  "Qiz",
  "Res",
  "Sem",
  "Stu",
  "Tap",
  "Tut",
] as const;
const fullCoursesOptions = [
  "SkipFullWaitlist",
  "FullOnly",
  "OverEnrolled",
] as const;
const cancelledCoursesOptions = ["Exclude", "Include", "Only"] as const;
const courseLevels = [
  "Lower Division (1-99)",
  "Upper Division (100-199)",
  "Graduate/Professional Only (200+)",
] as const;
const geCategories = [
  "GE Ia: Lower Division Writing",
  "GE Ib: Upper Division Writing",
  "GE II: Science and Technology",
  "GE III: Social & Behavioral Sciences",
  "GE IV: Arts and Humanities",
  "GE Va: Quantitative Literacy",
  "GE Vb: Formal Reasoning",
  "GE VI: Language Other Than English",
  "GE VII: Multicultural Studies",
  "GE VIII: International/Global Issues",
] as const;
const academicQuarters = ["Fall", "Winter", "Spring", "Summer"] as const;

/* endregion */

/* region Type declarations */

export type CourseLevel = (typeof courseLevels)[number];
export type GECategory = (typeof geCategories)[number];
export type AcademicQuarter = (typeof academicQuarters)[number];
export type Any = "ANY";
export type GE = Any | (typeof websocGECategories)[number];
export type Division = Any | (typeof divisions)[number];
export type SectionType = Any | (typeof sectionTypes)[number];
export type FullCourses = Any | (typeof fullCoursesOptions)[number];
export type CancelledCourses = (typeof cancelledCoursesOptions)[number];
export interface Department {
  deptLabel: string;
  deptValue: string;
}
export interface Term {
  year: string;
  quarter: (typeof quarters)[number];
}
export interface TermData {
  shortName: `${string} ${(typeof quarters)[number]}`;
  longName: string;
}

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

export type WebsocResponse = Response<{ schools: WebsocSchool[] }>;

export interface ErrorResponse extends IResponse {
  error: string;
  message: string;
}

/* endregion */

/* region Exported functions */

export const isErrorResponse = (r: IResponse): r is ErrorResponse => {
  return typeof r?.error === "string" && typeof r?.message === "string";
};

/* endregion */
