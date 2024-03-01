import type { Quarter, SectionType } from "./constants";

export type Meeting = {
  bldg: string[];
  days: string;
  time: string;
};

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
  meetings: Meeting[];
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
