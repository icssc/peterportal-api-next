import { Quarter, SectionType } from "./constants";

export type EnrollmentHistory = {
  year: string;
  quarter: Quarter;
  sectionCode: string;
  department: string;
  courseNumber: string;
  sectionType: SectionType;
  sectionNum: string;
  units: string;
  instructors: string[];
  meetings: string[];
  finalExam: string;
  dates: string[];
  maxCapacityHistory: string[];
  totalEnrolledHistory: string[];
  waitlistHistory: string[];
  waitlistCapHistory: string[];
  requestedHistory: string[];
  newOnlyReservedHistory: string[];
  statusHistory: string[];
};
