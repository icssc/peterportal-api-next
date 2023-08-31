export type CourseLevel = 0 | 1 | 2;
export type GECategory =
  | "GE-1A"
  | "GE-1B"
  | "GE-2"
  | "GE-3"
  | "GE-4"
  | "GE-5A"
  | "GE-5B"
  | "GE-6"
  | "GE-7"
  | "GE-8";
export type ResultType = "GE_CATEGORY" | "DEPARTMENT" | "COURSE" | "INSTRUCTOR";
export interface FilterOptions {
  courseLevel?: CourseLevel[];
  geList?: GECategory[];
  department?: string[];
  school?: string[];
}
export interface SearchParams {
  query?: string;
  numResults?: number;
  resultType?: ResultType;
  filterOptions?: FilterOptions;
}
export interface SearchResult {
  type: ResultType;
  name: string;
  metadata: CourseMetadata | InstructorMetadata;
}
export interface CourseMetadata {
  department: string;
  number: string;
  geList: GECategory[];
  courseLevel: CourseLevel;
  school: string;
}
export interface InstructorMetadata {
  ucinetid: string;
  school: string[];
  department: string;
}
export interface CourseSearchResult extends SearchResult {
  metadata: CourseMetadata;
}
export interface InstructorSearchResult extends SearchResult {
  metadata: InstructorMetadata;
}

export function isCourseSearchResult(sr: SearchResult): sr is CourseSearchResult {
  return "number" in sr.metadata;
}

export function isInstructorSearchResult(sr: SearchResult): sr is InstructorSearchResult {
  return "ucinetid" in sr.metadata;
}
