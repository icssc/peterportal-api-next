import { transform } from "@ap0nia/camaro";
import type { Department, TermData } from "@peterportal-api/types";
import { load } from "cheerio";
import fetch from "cross-fetch";

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
                  numOnWaitlist: "sec_enrollment/sec_waitlist[text() != ../../course_code]",
                  numWaitlistCap: "sec_enrollment/sec_wait_cap[text() != ../../course_code]",
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

/**
 * The list of quarters in an academic year.
 */
export const quarters = ["Fall", "Winter", "Spring", "Summer1", "Summer10wk", "Summer2"] as const;
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
 * The list of GE category codes.
 */
export const geCodes = [
  "GE-1A",
  "GE-1B",
  "GE-2",
  "GE-3",
  "GE-4",
  "GE-5A",
  "GE-5B",
  "GE-6",
  "GE-7",
  "GE-8",
] as const;

/**
 * The list of GE category names.
 */
export const geCategories = [
  "GE Ia: Lower Division Writing",
  "GE Ib: Upper Division Writing",
  "GE II: Science and Technology",
  "GE III: Social & Behavioral Sciences",
  "GE IV: Arts and Humanities",
  "GE Va: Quantitative Literacy",
  "GE Vb: Formal Reasoning",
  "GE VI: Language Other Than English",
  "GE VII: Multicultural Studies",
  "GE VIII: International/Global Issues",
] as const;

/**
 * The list of division codes.
 */
export const divisionCodes = ["LowerDiv", "UpperDiv", "Graduate"] as const;

/**
 * The list of course level (division) names.
 */
export const courseLevels = [
  "Lower Division (1-99)",
  "Upper Division (100-199)",
  "Graduate/Professional Only (200+)",
] as const;

/**
 * Represents the absence of a particular value to filter for.
 */
export const anyArray = ["ANY"] as const;

export type Any = (typeof anyArray)[number];

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
export type GE = Any | (typeof geCodes)[number];

/**
 * The division code.
 */
export type Division = Any | (typeof divisionCodes)[number];

/**
 * The course level name.
 */
export type CourseLevel = (typeof courseLevels)[number];

/**
 * The meeting time for a section.
 */
export type WebsocSectionMeeting = {
  /**
   * What day(s) the section meets on (e.g. ``MWF``).
   */
  days: string;

  /**
   * What time the section meets at.
   */
  time: string;

  /**
   * The building(s) the section meets in.
   */
  bldg: string[];
};

/**
 * The enrollment statistics for a section.
 */
export type WebsocSectionEnrollment = {
  /**
   * The total number of students enrolled in this section.
   */
  totalEnrolled: string;

  /**
   * The number of students enrolled in the section referred to by this section
   * code, if the section is cross-listed. If the section is not cross-listed,
   * this field is the empty string.
   */
  sectionEnrolled: string;
};

/**
 * A WebSoc section object.
 */
export type WebsocSection = {
  /**
   * The section code.
   */
  sectionCode: string;

  /**
   * The section type (e.g. ``Lec``, ``Dis``, ``Lab``, etc.)
   */
  sectionType: string;

  /**
   * The section number (e.g. ``A1``).
   */
  sectionNum: string;

  /**
   * The number of units afforded by taking this section.
   */
  units: string;

  /**
   * The name(s) of the instructor(s) teaching this section.
   */
  instructors: string[];

  /**
   * The meeting time(s) of this section.
   */
  meetings: WebsocSectionMeeting[];

  /**
   * The date and time of the final exam for this section.
   */
  finalExam: string;

  /**
   * The maximum capacity of this section.
   */
  maxCapacity: string;

  /**
   * The number of students currently enrolled (cross-listed or otherwise) in
   * this section.
   */
  numCurrentlyEnrolled: WebsocSectionEnrollment;

  /**
   * The number of students currently on the waitlist for this section.
   */
  numOnWaitlist: string;

  /**
   * The maximum number of students that can be on the waitlist for this section.
   */
  numWaitlistCap: string;

  /**
   * The number of students who have requested to be enrolled in this section.
   */
  numRequested: string;

  /**
   * The number of seats in this section reserved for new students.
   */
  numNewOnlyReserved: string;

  /**
   * The restriction code(s) for this section.
   */
  restrictions: string;

  /**
   * The enrollment status.
   */
  status: "OPEN" | "Waitl" | "FULL" | "NewOnly";

  /**
   * Any comments for the section.
   */
  sectionComment: string;
};

/**
 * A WebSoc course object.
 */
export type WebsocCourse = {
  /**
   * The code of the department the course belongs to.
   */
  deptCode: string;

  /**
   * The course number.
   */
  courseNumber: string;

  /**
   * The title of the course.
   */
  courseTitle: string;

  /**
   * Any comments for the course.
   */
  courseComment: string;

  /**
   * The link to the WebReg Course Prerequisites page for this course.
   */
  prerequisiteLink: string;

  /**
   * All sections of the course.
   */
  sections: WebsocSection[];
};

/**
 * A WebSoc department object.
 */
export type WebsocDepartment = {
  /**
   * The name of the department.
   */
  deptName: string;

  /**
   * The department code.
   */
  deptCode: string;

  /**
   * Any comments from the department.
   */
  deptComment: string;

  /**
   * All courses of the department.
   */
  courses: WebsocCourse[];

  /**
   * Any comments for section code(s) under the department.
   */
  sectionCodeRangeComments: string[];

  /**
   * Any comments for course number(s) under the department.
   */
  courseNumberRangeComments: string[];
};

/**
 * A WebSoc school object.
 */
export type WebsocSchool = {
  /**
   * The name of the school.
   */
  schoolName: string;

  /**
   * Any comments from the school.
   */
  schoolComment: string;

  /**
   * All departments of the school.
   */
  departments: WebsocDepartment[];
};

/**
 * An object that represents a specific term.
 */
export type Term = {
  /**
   * The year of the term.
   */
  year: string;

  /**
   * The quarter of the term.
   */
  quarter: Quarter;
};

/**
 * The type alias for the response from {@link `callWebSocAPI`}.
 */
export type WebsocAPIResponse = {
  /**
   * All schools matched by the query.
   */
  schools: WebsocSchool[];
};

/**
 * The type alias for the options object accepted by {@link `callWebSocAPI`}.
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
export type WebsocAPIOptions = RequiredOptions & BuildingRoomOptions & OptionalOptions;

function getCodedTerm(term: Term): string {
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
}

function getCodedDiv(div: Division): string {
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
}

export async function callWebSocAPI(
  term: Term,
  options: WebsocAPIOptions,
): Promise<WebsocAPIResponse> {
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

  const json: WebsocAPIResponse = await transform(await response.text(), template);

  json.schools.forEach((school) =>
    school.departments.forEach((department) =>
      department.courses.forEach((course) =>
        course.sections.forEach((section) => {
          section.meetings.forEach((meeting) => {
            meeting.bldg = [meeting.bldg].flat();
          });
          section.meetings = getUniqueMeetings(section.meetings);
        }),
      ),
    ),
  );
  return json;
}

function getUniqueMeetings(meetings: WebsocSectionMeeting[]) {
  return meetings.reduce((acc, meeting) => {
    const i = acc.findIndex((m) => m.days === meeting.days && m.time === meeting.time);
    if (i === -1) {
      acc.push(meeting);
    } else {
      acc[i].bldg.push(...meeting.bldg);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);
}

// Returns all currently visible undergraduate and graduate terms.
export async function getTerms(): Promise<TermData[]> {
  const response = await (await fetch("https://www.reg.uci.edu/perl/WebSoc")).text();

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
}

/**
 * Returns all departments.
 */
export async function getDepts(): Promise<Department[]> {
  const response = await (await fetch("https://www.reg.uci.edu/perl/WebSoc")).text();

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
        .map((y) => y.trim()),
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
}
