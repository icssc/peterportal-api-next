import { load } from "cheerio";
import fetch from "cross-fetch";
import { XMLParser } from "fast-xml-parser";
import {
  CancelledCourses,
  Department,
  Division,
  FullCourses,
  GE,
  SectionType,
  Term,
  TermData,
  WebsocSchool,
} from "peterportal-api-next-types";

/* region Type declarations */

export interface WebsocAPIOptions {
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

export interface WebsocAPIResponse {
  schools: WebsocSchool[];
}

/* endregion */

/* region Internal helper functions */

const getCodedTerm = (term: Term): string => {
  switch (term.quarter) {
    case "Fall":
      return `${term.year}-92`;
    case "Winter":
      return `${term.year}-03`;
    case "Spring":
      return `${term.year}-14`;
    case "Summer10wk":
      return `${term.year}-39`;
    case "Summer1":
      return `${term.year}-25`;
    case "Summer2":
      return `${term.year}-76`;
  }
};

const getCodedDiv = (div: Division): string => {
  switch (div) {
    case "ANY":
      return "all";
    case "LowerDiv":
      return "0xx";
    case "UpperDiv":
      return "1xx";
    case "Graduate":
      return "2xx";
  }
};
/* endregion */

/* region Exported functions */

export const callWebSocAPI = async (
  term: Term,
  options: WebsocAPIOptions
): Promise<WebsocAPIResponse> => {
  const {
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
    fullCourses = "",
    cancelledCourses = "",
    building = "",
    room = "",
  } = options;

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
              ? y.course_code_range_comment.map((z: any) => z.__text)
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
  return json;
};

// Returns all currently visible undergraduate and graduate terms.
export const getTerms = async (): Promise<TermData[]> => {
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
    .map((x): TermData | void => {
      const year = x.slice(0, 4);
      if (x.includes("Fall")) {
        return {
          shortName: `${year} Fall`,
          longName: x,
        };
      }
      if (x.includes("Winter")) {
        return {
          shortName: `${year} Winter`,
          longName: x,
        };
      }
      if (x.includes("Spring")) {
        return {
          shortName: `${year} Spring`,
          longName: x,
        };
      }
      if (x.includes("10-wk")) {
        return {
          shortName: `${year} Summer10wk`,
          longName: x,
        };
      }
      if (x.includes("Session 1")) {
        return {
          shortName: `${year} Summer1`,
          longName: x,
        };
      }
      if (x.includes("Session 2")) {
        return {
          shortName: `${year} Summer2`,
          longName: x,
        };
      }
    }) as TermData[];
};

// Returns all departments.
export const getDepts = async (): Promise<Department[]> => {
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
    .map((x) =>
      x
        .split(".")
        .filter((y) => y != " ")
        .map((y) => y.trim())
    )
    .filter((x) => x[0].length)
    .map((x): Department => {
      return x.length === 1
        ? {
            deptLabel: `ALL: Include All Departments`,
            deptValue: "ALL",
          }
        : {
            deptLabel: `${x[0]}: ${x[1].split("(started")[0].trim()}`,
            deptValue: x[0],
          };
    })
    .filter((x) => !x.deptLabel.includes("until"));
};

/* endregion */
