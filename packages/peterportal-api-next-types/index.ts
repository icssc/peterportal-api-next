/* region Constants */

export const quarters = [
  "Fall",
  "Winter",
  "Spring",
  "Summer1",
  "Summer10wk",
  "Summer2",
] as const;
export const geCategories = {
  "GE-1A": "GE Ia: Lower Division Writing",
  "GE-1B": "GE Ib: Upper Division Writing",
  "GE-2": "GE II: Science and Technology",
  "GE-3": "GE III: Social & Behavioral Sciences",
  "GE-4": "GE IV: Arts and Humanities",
  "GE-5A": "GE Va: Quantitative Literacy",
  "GE-5B": "GE Vb: Formal Reasoning",
  "GE-6": "GE VI: Language Other Than English",
  "GE-7": "GE VII: Multicultural Studies",
  "GE-8": "GE VIII: International/Global Issues",
} as const;
export const divisions = {
  LowerDiv: "Lower Division (1-99)",
  UpperDiv: "Upper Division (100-199)",
  Graduate: "Graduate/Professional Only (200+)",
} as const;
export const sectionTypes = [
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
export const fullCoursesOptions = [
  "SkipFullWaitlist",
  "FullOnly",
  "OverEnrolled",
] as const;
export const cancelledCoursesOptions = ["Exclude", "Include", "Only"] as const;
export const academicQuarters = ["Fall", "Winter", "Spring", "Summer"] as const;

/* endregion */

/* region Type declarations */

export type CourseLevel = (typeof divisions)[keyof typeof divisions];
export type GECategory = (typeof geCategories)[keyof typeof geCategories];
export type AcademicQuarter = (typeof academicQuarters)[number];
export type Any = "ANY";
export type GE = Any | keyof typeof geCategories;
export type Division = Any | keyof typeof divisions;
export type SectionType = Any | (typeof sectionTypes)[number];
export type FullCourses = Any | (typeof fullCoursesOptions)[number];
export type CancelledCourses = (typeof cancelledCoursesOptions)[number];
export type Quarter = (typeof quarters)[number];
export type Department = {
  deptLabel: string;
  deptValue: string;
};
export type Term = {
  year: string;
  quarter: Quarter;
};
export type TermData = {
  shortName: `${string} ${Quarter}`;
  longName: string;
};

export type PrerequisiteTree = {
  AND?: string[];
  OR?: string[];
};

export type Course = {
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
};

export type GradeSection = {
  academicYear: string;
  academicQuarter: AcademicQuarter;
  instructor: string;
  type: string;
};

export type GradeDistribution = {
  gradeACount: number;
  gradeBCount: number;
  gradeCCount: number;
  gradeDCount: number;
  gradeFCount: number;
  gradePCount: number;
  gradeNPCount: number;
  gradeWCount: number;
  averageGPA: number;
};

export type GradesRaw = (GradeSection & GradeDistribution)[];

export type GradesCalculated = {
  gradeDistribution: GradeDistribution & { count: number };
  courseList: GradeSection[];
};

export type Instructor = {
  ucinetid: string;
  instructorName: string;
  shortenedName: string;
  title: string;
  department: string;
  schools: string[];
  relatedDepartments: string[];
  courseHistory: string[];
};

export type WebsocSectionMeeting = {
  days: string;
  time: string;
  bldg: string;
};

export type WebsocSectionEnrollment = {
  totalEnrolled: string;
  sectionEnrolled: string;
};

export type WebsocSection = {
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
};

export type WebsocCourse = {
  deptCode: string;
  courseNumber: string;
  courseTitle: string;
  courseComment: string;
  prerequisiteLink: string;
  sections: WebsocSection[];
};

export type WebsocDepartment = {
  deptName: string;
  deptCode: string;
  deptComment: string;
  courses: WebsocCourse[];
  sectionCodeRangeComments: string[];
  courseNumberRangeComments: string[];
};

export type WebsocSchool = {
  schoolName: string;
  schoolComment: string;
  departments: WebsocDepartment[];
};

export type WebsocAPIResponse = {
  schools: WebsocSchool[];
};

export type IResponse = {
  timestamp: string;
  requestId: string;
  statusCode: number;
  payload?: unknown;
  error?: unknown;
  message?: unknown;
};

export type Response<T> = Omit<IResponse, "error" | "message"> & {
  payload: T;
};

export type ErrorResponse = Omit<IResponse, "payload"> & {
  error: string;
  message: string;
};

export type RawResponse<T> = Response<T> | ErrorResponse;

/* endregion */

/* region Exported functions */

export const isErrorResponse = <T>(r: RawResponse<T>): r is ErrorResponse =>
  "error" in r;

/* endregion */
