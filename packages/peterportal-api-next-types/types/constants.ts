/**
 * The list of quarters in an academic year.
 */
export const quarters = [
  "Fall",
  "Winter",
  "Spring",
  "Summer1",
  "Summer10wk",
  "Summer2",
] as const;
/**
 * The list of all section types.
 */
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
/**
 * The list of options for filtering full courses.
 */
export const fullCoursesOptions = [
  "SkipFull",
  "SkipFullWaitlist",
  "FullOnly",
  "OverEnrolled",
] as const;
/**
 * The list of options for filtering cancelled courses.
 */
export const cancelledCoursesOptions = ["Exclude", "Include", "Only"] as const;
/**
 * The mapping of GE category codes to their full names.
 */
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
/**
 * The mapping of division codes to their full names.
 */
export const divisions = {
  LowerDiv: "Lower Division (1-99)",
  UpperDiv: "Upper Division (100-199)",
  Graduate: "Graduate/Professional Only (200+)",
} as const;

/**
 * Represents the absence of a particular value to filter for.
 */
export type Any = "ANY";
/**
 * The quarter in an academic year.
 */
export type Quarter = (typeof quarters)[number];
/**
 * The type of the section.
 */
export type SectionType = Any | (typeof sectionTypes)[number];
/**
 * The option to filter full courses by.
 */
export type FullCourses = Any | (typeof fullCoursesOptions)[number];
/**
 * The option to filter cancelled courses by.
 */
export type CancelledCourses = (typeof cancelledCoursesOptions)[number];
/**
 * The GE category code.
 */
export type GE = Any | keyof typeof geCategories;
/**
 * The GE category name.
 */
export type GECategory = (typeof geCategories)[keyof typeof geCategories];
/**
 * The division code.
 */
export type Division = Any | keyof typeof divisions;
/**
 * The course level name.
 */
export type CourseLevel = (typeof divisions)[keyof typeof divisions];
