import { transform } from "camaro";
import { load } from "cheerio";
import fetch from "cross-fetch";
import {
  CancelledCourses,
  Department,
  Division,
  FullCourses,
  GE,
  SectionType,
  Term,
  TermData,
  WebsocAPIResponse,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";

/* region Constants */

const template = {
  schools: [
    "//school",
    {
      schoolName: "@school_name",
      schoolComment: "//school_comment",
      departments: [
        "department",
        {
          deptComment: "department_comment",
          sectionCodeRangeComments: ["course_code_range_comment", "text()"],
          courseNumberRangeComments: ["course_number_range_comment", "text()"],
          deptCode: "@dept_code",
          deptName: "@dept_name",
          courses: [
            "course",
            {
              deptCode: "../@dept_code",
              courseComment: "course_comment",
              prerequisiteLink: "course_prereq_link",
              courseNumber: "@course_number",
              courseTitle: "@course_title",
              sections: [
                "section",
                {
                  sectionCode: "course_code",
                  sectionType: "sec_type",
                  sectionNum: "sec_num",
                  units: "sec_units",
                  instructors: ["sec_instructors/instructor", "."],
                  meetings: [
                    "sec_meetings/sec_meet",
                    {
                      days: "sec_days",
                      time: "sec_time",
                      bldg: "concat(sec_bldg, ' ', sec_room)",
                    },
                  ],
                  finalExam:
                    "normalize-space(concat(sec_final/sec_final_day, ' ', sec_final/sec_final_date, ' ', sec_final/sec_final_time))",
                  maxCapacity: "sec_enrollment/sec_max_enroll",
                  numCurrentlyEnrolled: {
                    totalEnrolled: "sec_enrollment/sec_enrolled",
                    sectionEnrolled: "sec_enrollment/sec_xlist_subenrolled",
                  },
                  numOnWaitlist:
                    "sec_enrollment/sec_waitlist[text() != ../../course_code]",
                  numWaitlistCap:
                    "sec_enrollment/sec_wait_cap[text() != ../../course_code]",
                  numRequested: "sec_enrollment/sec_enroll_requests",
                  numNewOnlyReserved:
                    "sec_enrollment/sec_new_only_reserved[text() != ../../course_code]",
                  restrictions: "sec_restrictions",
                  status: "sec_status",
                  sectionComment: "sec_comment",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/* region Internal type declarations */

type RequireAtLeastOne<T, R extends keyof T = keyof T> = Omit<T, R> &
  { [P in R]: Required<Pick<T, P>> & Partial<Omit<T, P>> }[R];

type RequiredOptions = RequireAtLeastOne<{
  ge?: GE;
  department?: string;
  sectionCodes?: string;
  instructorName?: string;
}>;

type BuildingRoomOptions =
  | {
      building?: never;
      room?: never;
    }
  | {
      building: string;
      room?: never;
    }
  | {
      building: string;
      room: string;
    };

type OptionalOptions = {
  division?: Division;
  courseNumber?: string;
  courseTitle?: string;
  sectionType?: SectionType;
  units?: string;
  days?: string;
  startTime?: string;
  endTime?: string;
  maxCapacity?: string;
  fullCourses?: FullCourses;
  cancelledCourses?: CancelledCourses;
};

/* endregion */

/* region Exported type declarations */

/**
 * The type alias for the options object accepted by `callWebSocAPI`.
 *
 * If your editor supports intelligent code completion, the fully expanded
 * initial type will probably look horrifying. But it's really not that bad.
 *
 * It is an error to not provide any of
 * {GE category, department, section code, instructor};
 * it is also an error to provide only the room number without a building code.
 * This type alias strictly enforces these invariants instead of checking during
 * runtime.
 */
export type WebsocAPIOptions = RequiredOptions &
  BuildingRoomOptions &
  OptionalOptions;

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
    department = "ANY",
    courseNumber = "",
    division = "ANY",
    sectionCodes = "",
    instructorName = "",
    courseTitle = "",
    sectionType = "ANY",
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
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc", {
    method: "POST",
    body: data,
    redirect: "error",
  });

  const json: WebsocAPIResponse = await transform(
    await response.text(),
    template
  );
  json.schools.forEach((school) =>
    school.departments.forEach((department) =>
      department.courses.forEach((course) =>
        course.sections.forEach((section) => {
          section.meetings.forEach((meeting) => {
            meeting.bldg = [meeting.bldg].flat();
          });
          section.meetings = getUniqueMeetings(section.meetings);
        })
      )
    )
  );
  return json;
};

function getUniqueMeetings(meetings: WebsocSectionMeeting[]) {
  return meetings.reduce((acc, meeting) => {
    const i = acc.findIndex(
      (m) => m.days === meeting.days && m.time === meeting.time
    );
    if (i === -1) {
      acc.push(meeting);
    } else {
      acc[i].bldg.push(...meeting.bldg);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);
}

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
