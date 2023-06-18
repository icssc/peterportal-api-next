/**
 * The list of quarters in an academic year.
 */
export const quarters = ['Fall', 'Winter', 'Spring', 'Summer1', 'Summer10wk', 'Summer2'] as const
/**
 * The list of all section types.
 */
export const sectionTypes = [
  'Act',
  'Col',
  'Dis',
  'Fld',
  'Lab',
  'Lec',
  'Qiz',
  'Res',
  'Sem',
  'Stu',
  'Tap',
  'Tut',
] as const
/**
 * The list of options for filtering full courses.
 */
export const fullCoursesOptions = [
  'SkipFull',
  'SkipFullWaitlist',
  'FullOnly',
  'OverEnrolled',
] as const
/**
 * The list of options for filtering cancelled courses.
 */
export const cancelledCoursesOptions = ['Exclude', 'Include', 'Only'] as const
/**
 * The list of GE category codes.
 */
export const geCodes = [
  'GE-1A',
  'GE-1B',
  'GE-2',
  'GE-3',
  'GE-4',
  'GE-5A',
  'GE-5B',
  'GE-6',
  'GE-7',
  'GE-8',
] as const
/**
 * The list of GE category names.
 */
export const geCategories = [
  'GE Ia: Lower Division Writing',
  'GE Ib: Upper Division Writing',
  'GE II: Science and Technology',
  'GE III: Social & Behavioral Sciences',
  'GE IV: Arts and Humanities',
  'GE Va: Quantitative Literacy',
  'GE Vb: Formal Reasoning',
  'GE VI: Language Other Than English',
  'GE VII: Multicultural Studies',
  'GE VIII: International/Global Issues',
] as const
/**
 * The list of division codes.
 */
export const divisionCodes = ['LowerDiv', 'UpperDiv', 'Graduate'] as const
/**
 * The list of course level (division) names.
 */
export const courseLevels = [
  'Lower Division (1-99)',
  'Upper Division (100-199)',
  'Graduate/Professional Only (200+)',
] as const

/**
 * Represents the absence of a particular value to filter for.
 */
export const anyArray = ['ANY'] as const
export type Any = (typeof anyArray)[number]
/**
 * The quarter in an academic year.
 */
export type Quarter = (typeof quarters)[number]
/**
 * The type of the section.
 */
export type SectionType = Any | (typeof sectionTypes)[number]
/**
 * The option to filter full courses by.
 */
export type FullCourses = Any | (typeof fullCoursesOptions)[number]
/**
 * The option to filter cancelled courses by.
 */
export type CancelledCourses = (typeof cancelledCoursesOptions)[number]
/**
 * The GE category code.
 */
export type GE = Any | (typeof geCodes)[number]
/**
 * The GE category name.
 */
export type GECategory = (typeof geCategories)[number]
/**
 * The division code.
 */
export type Division = Any | (typeof divisionCodes)[number]
/**
 * The course level name.
 */
export type CourseLevel = (typeof courseLevels)[number]
