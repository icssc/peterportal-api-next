import { load } from "cheerio";
import fetch from "cross-fetch";
import { XMLParser } from "fast-xml-parser";

/* region Type declarations */

export type Term = `${string}${
  | "Fall"
  | "Winter"
  | "Spring"
  | "Summer1"
  | "Summer10wk"
  | "Summer2"}`;
export type GE =
  | "ANY"
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
export type Division = "ANY" | "LowerDiv" | "UpperDiv" | "Graduate";
export type SectionType =
  | "ALL"
  | "Act"
  | "Col"
  | "Dis"
  | "Fld"
  | "Lab"
  | "Lec"
  | "Qiz"
  | "Res"
  | "Sem"
  | "Stu"
  | "Tap"
  | "Tut";
export type FullCourses =
  | "ANY"
  | "SkipFullWaitlist"
  | "FullOnly"
  | "OverEnrolled";
export type CancelledCourses = "Exclude" | "Include" | "Only";

export interface WebsocAPIOptions {
  term: Term;
  ge?: GE;
  department?: string;
  courseNumber?: string;
  division?: Division;
  sectionCodes?: string;
  instructorName?: string;
  courseTitle?: string;
  sectionType?: SectionType;
  units?: string;
  days?: string;
  startTime?: string;
  endTime?: string;
  maxCapacity?: string;
  fullCourses?: FullCourses;
  cancelledCourses?: CancelledCourses;
  building?: string;
  room?: string;
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

export interface WebsocAPIResponse {
  schools: WebsocSchool[];
}
/* endregion */

/* region Internal helper functions */

const getCodedTerm = (term: Term): string => {
  if (term.includes("Fall")) {
    return term.slice(0, 4) + "-92";
  } else if (term.includes("Winter")) {
    return term.slice(0, 4) + "-03";
  } else if (term.includes("Spring")) {
    return term.slice(0, 4) + "-14";
  } else if (term.includes("Summer10wk")) {
    return term.slice(0, 4) + "-39";
  } else if (term.includes("Summer1")) {
    return term.slice(0, 4) + "-25";
  } else if (term.includes("Summer2")) {
    return term.slice(0, 4) + "-76";
  }
  throw new Error("Error: Invalid term provided.");
};

const getCodedDiv = (div: Division): string => {
  if (div === "ANY") {
    return "all";
  } else if (div === "LowerDiv") {
    return "0xx";
  } else if (div === "UpperDiv") {
    return "1xx";
  } else if (div === "Graduate") {
    return "2xx";
  }
  throw new Error("Error: Invalid division provided.");
};
/* endregion */

/* region Exported functions */

export const callWebSocAPI = async ({
  term,
  ge = "ANY",
  department = "ALL",
  courseNumber = "",
  division = "ANY",
  sectionCodes = "",
  instructorName = "",
  courseTitle = "",
  sectionType = "ALL",
  units = "",
  days = "",
  startTime = "",
  endTime = "",
  maxCapacity = "",
  fullCourses = "ANY",
  cancelledCourses = "Exclude",
  building = "",
  room = "",
}: WebsocAPIOptions): Promise<WebsocAPIResponse> => {
  if (
    department === "ALL" &&
    ge === "ANY" &&
    sectionCodes === "" &&
    instructorName === ""
  ) {
    throw new Error(
      "You must provide at least one of department, GE, sectionCodes, or instructorName."
    );
  } else if (building === "" && room !== "") {
    throw new Error(
      "You must specify a building code if you specify a room number."
    );
  }

  const postData = {
    Submit: "Display XML Results",
    YearTerm: getCodedTerm(term),
    ShowComments: "on",
    ShowFinals: "on",
    Breadth: ge,
    Dept: department,
    CourseNum: courseNumber,
    Division: getCodedDiv(division),
    CourseCodes: sectionCodes,
    InstrName: instructorName,
    CourseTitle: courseTitle,
    ClassType: sectionType,
    Units: units,
    Days: days,
    StartTime: startTime,
    EndTime: endTime,
    MaxCap: maxCapacity,
    FullCourses: fullCourses,
    CancelledCourses: cancelledCourses,
    Bldg: building,
    Room: room,
  };

  const data = new URLSearchParams(postData);
  const json = { schools: [] };

  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc", {
    method: "POST",
    body: data,
  });

  const parser = new XMLParser({
    attributeNamePrefix: "__",
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
    textNodeName: "__text",
    trimValues: false,
  });
  const res = parser.parse(await response.text());
  json.schools =
    res.websoc_results && res.websoc_results.course_list
      ? (Array.isArray(res.websoc_results.course_list.school)
          ? res.websoc_results.course_list.school
          : [res.websoc_results.course_list.school]
        ).map((x: any) => ({
          schoolName: x.__school_name,
          schoolComment: x.school_comment,
          departments: (Array.isArray(x.department)
            ? x.department
            : [x.department]
          ).map((y: any) => ({
            deptComment: y.department_comment ? y.department_comment : "",
            sectionCodeRangeComments: y.course_code_range_comment
              ? Array.isArray(y.course_code_range_comment)
                ? y.course_code_range_comment.map((z: any) => z.__text)
                : [y.course_code_range_comment.__text]
              : [],
            courseNumberRangeComments: y.course_number_range_comment
              ? Array.isArray(y.course_number_range_comment)
                ? y.course_number_range_comment.map((z: any) => z.__text)
                : [y.course_number_range_comment.__text]
              : [],
            deptCode: y.__dept_code,
            deptName: y.__dept_name,
            courses: (Array.isArray(y.course) ? y.course : [y.course]).map(
              (z: any) => ({
                deptCode: y.__dept_code,
                courseComment: z.course_comment ? z.course_comment : "",
                prerequisiteLink: z.course_prereq_link
                  ? z.course_prereq_link
                  : "",
                courseNumber: z.__course_number,
                courseTitle: z.__course_title,
                sections: (Array.isArray(z.section)
                  ? z.section
                  : [z.section]
                ).map((w: any) => ({
                  sectionCode: w.course_code,
                  sectionType: w.sec_type,
                  sectionNum: w.sec_num,
                  units: w.sec_units,
                  instructors: (Array.isArray(w.sec_instructors?.instructor)
                    ? w.sec_instructors.instructor
                    : [w.sec_instructors?.instructor]
                  ).filter((x: any) => x),
                  meetings: (Array.isArray(w.sec_meetings.sec_meet)
                    ? w.sec_meetings.sec_meet
                    : [w.sec_meetings.sec_meet]
                  ).map((v: any) => ({
                    days: v.sec_days,
                    time: v.sec_time,
                    bldg: `${v.sec_bldg} ${v.sec_room}`,
                  })),
                  finalExam: w.sec_final
                    ? w.sec_final.sec_final_date === "TBA"
                      ? "TBA"
                      : `${w.sec_final.sec_final_day} ${w.sec_final.sec_final_date} ${w.sec_final.sec_final_time}`
                    : "",
                  maxCapacity: w.sec_enrollment.sec_max_enroll,
                  numCurrentlyEnrolled: {
                    totalEnrolled: w.sec_enrollment.sec_enrolled,
                    sectionEnrolled: w.sec_enrollment.sec_xlist_subenrolled
                      ? w.sec_enrollment.sec_xlist_subenrolled
                      : "",
                  },
                  numOnWaitlist:
                    w.sec_enrollment.sec_waitlist !== w.course_code
                      ? w.sec_enrollment.sec_waitlist
                      : "",
                  numRequested: w.sec_enrollment.sec_enroll_requests,
                  numNewOnlyReserved:
                    w.sec_enrollment.sec_new_only_reserved !== w.course_code
                      ? w.sec_enrollment.sec_new_only_reserved
                      : "",
                  restrictions: w.sec_restrictions ? w.sec_restrictions : "",
                  status: w.sec_status,
                  sectionComment: w.sec_comment ? w.sec_comment : "",
                })),
              })
            ),
          })),
        }))
      : [];
  if (json.schools === undefined) {
    throw new Error("Error: Could not retrieve any data from WebSoc.");
  } else {
    return json;
  }
};

// Returns all currently visible undergraduate and graduate terms.
export const getTerms = async (): Promise<Term[]> => {
  const response = await (
    await fetch("https://www.reg.uci.edu/perl/WebSoc")
  ).text();
  const $ = load(response);
  return $("form")
    .eq(1)
    .find("td")
    .eq(2)
    .text()
    .replace(/\t/g, "")
    .replace(/ {2}/g, " ")
    .replace(/ {2}/g, "")
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x && !x.includes("Law") && !x.includes("COM"))
    .map((x) => {
      if (x.includes("Fall")) {
        return `${x.slice(0, 4)} Fall` as Term;
      }
      if (x.includes("Winter")) {
        return `${x.slice(0, 4)} Winter` as Term;
      }
      if (x.includes("Spring")) {
        return `${x.slice(0, 4)} Spring` as Term;
      }
      if (x.includes("10-wk")) {
        return `${x.slice(0, 4)} 10wk` as Term;
      }
      if (x.includes("Session 1")) {
        return `${x.slice(0, 4)} Summer1` as Term;
      }
      if (x.includes("Session 2")) {
        return `${x.slice(0, 4)} Summer2` as Term;
      }
      throw new Error(`Invalid term ${x} provided.`);
    });
};

// Returns all department codes.
export const getDeptCodes = async (): Promise<string[]> => {
  const response = await (
    await fetch("https://www.reg.uci.edu/perl/WebSoc")
  ).text();
  const $ = load(response);
  return $("form")
    .eq(1)
    .find("select")
    .eq(2)
    .text()
    .replace(/\t/g, "")
    .replace(/ {4}/g, "")
    .split("\n")
    .map((x) => x.split(" .")[0])
    .filter((x) => x)
    .slice(1);
};
/* endregion */
