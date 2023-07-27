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
  readonly courseLevel?: CourseLevel[];
  readonly geList?: GECategory[];
  readonly department?: string[];
  readonly school?: string[];
}
export interface SearchParams {
  readonly query?: string;
  readonly numResults?: number;
  readonly resultType?: ResultType;
  readonly filterOptions?: FilterOptions;
}
export interface SearchResult {
  readonly type: ResultType;
  readonly name: string;
  readonly metadata: CourseMetadata | InstructorMetadata;
}
export interface CourseMetadata {
  readonly department: string;
  readonly number: string;
  readonly geList: GECategory[];
  readonly courseLevel: CourseLevel;
  readonly school: string;
}
export interface InstructorMetadata {
  readonly ucinetid: string;
  readonly school: string[];
  readonly department: string;
}
export interface CourseSearchResult extends SearchResult {
  readonly metadata: CourseMetadata;
}
export interface InstructorSearchResult extends SearchResult {
  readonly metadata: InstructorMetadata;
}

export function isCourseSearchResult(sr: SearchResult): sr is CourseSearchResult {
  return "number" in sr.metadata;
}

export function isInstructorSearchResult(sr: SearchResult): sr is InstructorSearchResult {
  return "ucinetid" in sr.metadata;
}
