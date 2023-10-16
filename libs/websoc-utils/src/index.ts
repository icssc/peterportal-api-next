import type {
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "@libs/uc-irvine-api/websoc";
import type {
  DayOfWeek,
  WebsocAPIResponse as NormalizedResponse,
  WebsocCourse as NormalizedCourse,
  WebsocDepartment as NormalizedDepartment,
  WebsocSectionFinalExam as NormalizedFinalExam,
  WebsocSchool as NormalizedSchool,
  WebsocSection as NormalizedSection,
  WebsocSectionMeeting as NormalizedMeeting,
} from "@peterportal-api/types";

export type EnhancedSection = {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
};

/**
 * Normalized section that also contains all relevant WebSoc metadata.
 */
export type EnhancedNormalizedSection = {
  school: NormalizedSchool;
  department: NormalizedDepartment;
  course: NormalizedCourse;
  section: NormalizedSection;
};

/**
 * type guard that asserts that the settled promise was fulfilled
 */
export const fulfilled = <T>(value: PromiseSettledResult<T>): value is PromiseFulfilledResult<T> =>
  value.status === "fulfilled";

/**
 * type guard that asserts input is defined
 */
export const notNull = <T>(x: T): x is NonNullable<T> => x != null;

/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
export const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
const lexOrd = (a: string, b: string): number => (a === b ? 0 : a > b ? 1 : -1);

/**
 * Get unique array of meetings.
 */
const getUniqueMeetings = (meetings: WebsocSectionMeeting[]) =>
  meetings.reduce((acc, meeting) => {
    if (!acc.find((m) => m.days === meeting.days && m.time === meeting.time)) {
      acc.push(meeting);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);

/**
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
export function combineAndNormalizeResponses(
  ...responses: WebsocAPIResponse[]
): NormalizedResponse {
  const allSections = responses.flatMap((response) =>
    response.schools.flatMap((school) =>
      school.departments.flatMap((department) =>
        department.courses.flatMap((course) =>
          course.sections.map((section) => isolateSection({ school, department, course, section })),
        ),
      ),
    ),
  );

  /**
   * for each section:
   * if one of its parent structures hasn't been declared,
   * append the corresponding structure of the section
   */
  const schools = allSections.reduce((acc, section) => {
    const foundSchool = acc.find((s) => s.schoolName === section.school.schoolName);
    if (!foundSchool) {
      acc.push(section.school);
      return acc;
    }

    const foundDept = foundSchool.departments.find(
      (d) => d.deptCode === section.department.deptCode,
    );
    if (!foundDept) {
      foundSchool.departments.push(section.department);
      return acc;
    }

    const foundCourse = foundDept.courses.find(
      (c) =>
        c.courseNumber === section.course.courseNumber &&
        c.courseTitle === section.course.courseTitle,
    );
    if (!foundCourse) {
      foundDept.courses.push(section.course);
      return acc;
    }

    const foundSection = foundCourse.sections.find(
      (s) => s.sectionCode === section.section.sectionCode,
    );
    if (!foundSection) {
      foundCourse.sections.push(section.section);
      return acc;
    }

    return acc;
  }, [] as NormalizedSchool[]);

  return { schools };
}

function parseNonTBAStartAndEndTimes(time: string) {
  let startTime, endTime;
  const [startTimeString, endTimeString] = time
    .trim()
    .split("-")
    .map((x) => x.trim());
  const [startTimeHour, startTimeMinute] = startTimeString.split(":");
  startTime = (parseInt(startTimeHour, 10) % 12) * 60 + parseInt(startTimeMinute, 10);
  const [endTimeHour, endTimeMinute] = endTimeString.split(":");
  endTime = (parseInt(endTimeHour, 10) % 12) * 60 + parseInt(endTimeMinute, 10);
  if (endTimeMinute.includes("p")) {
    startTime += 12 * 60;
    endTime += 12 * 60;
  }
  if (startTime > endTime) startTime -= 12 * 60;
  return {
    startTime: { hour: Math.floor(startTime / 60), minute: startTime % 60 },
    endTime: { hour: Math.floor(endTime / 60), minute: endTime % 60 },
  };
}

function parseFinalExamString(section: WebsocSection): NormalizedFinalExam {
  if (section.finalExam === "")
    return {
      examStatus: "NO_FINAL",
      dayOfWeek: null,
      month: null,
      day: null,
      startTime: null,
      endTime: null,
      bldg: null,
    };
  if (section.finalExam === "TBA")
    return {
      examStatus: "TBA_FINAL",
      dayOfWeek: null,
      month: null,
      day: null,
      startTime: null,
      endTime: null,
      bldg: null,
    };
  const [dateTime, locations] = section.finalExam.split("@").map((x) => x?.trim());
  const [dayOfWeek, month, day, time] = dateTime.split(" ");
  const { startTime, endTime } = parseNonTBAStartAndEndTimes(time);
  return {
    examStatus: "SCHEDULED_FINAL",
    dayOfWeek: dayOfWeek as DayOfWeek,
    month: months.indexOf(month),
    day: parseInt(day, 10),
    startTime,
    endTime,
    bldg: locations ? locations.split(",").map((x) => x?.trim()) : [section.meetings[0].bldg[0]],
  };
}

/**
 * Given all parent data about a section, isolate relevant data.
 * @returns ``EnhancedNormalizedSection`` with all deduped, relevant metadata.
 */
function isolateSection(data: EnhancedSection): EnhancedNormalizedSection {
  const section = {
    ...data.section,
    finalExam: parseFinalExamString(data.section),
    meetings: getUniqueMeetings(data.section.meetings).map((meeting): NormalizedMeeting => {
      const { bldg, days, time } = meeting;
      const timeIsTBA = meeting.time === "TBA";
      return {
        timeIsTBA,
        bldg,
        ...(timeIsTBA
          ? { days: null, startTime: null, endTime: null }
          : { days, ...parseNonTBAStartAndEndTimes(time) }),
      };
    }),
  };

  const course = {
    ...data.course,
    sections: [section],
  };

  const department = {
    ...data.department,
    courses: [course],
  };

  const school = {
    ...data.school,
    departments: [department],
  };

  return { school, department, course, section };
}

/**
 * Deeply sorts the provided response and returns the sorted response.
 *
 * Schools are sorted in lexicographical order of their name, departments are
 * sorted in lexicographical order of their code, courses are sorted in
 * numerical order of their number (with lexicographical tiebreaks),
 * and sections are sorted in numerical order of their code.
 * @param response The response to sort.
 */
export function sortResponse<T extends WebsocAPIResponse | NormalizedResponse>(response: T): T {
  response.schools.forEach((schools) => {
    schools.departments.forEach((department) => {
      department.courses.forEach((course) =>
        course.sections.sort((a, b) => parseInt(a.sectionCode, 10) - parseInt(b.sectionCode, 10)),
      );
      department.courses.sort((a, b) => {
        const numOrd =
          parseInt(a.courseNumber.replace(/\D/g, ""), 10) -
          parseInt(b.courseNumber.replace(/\D/g, ""), 10);
        return numOrd ? numOrd : lexOrd(a.courseNumber, b.courseNumber);
      });
    });
    schools.departments.sort((a, b) => lexOrd(a.deptCode, b.deptCode));
  });

  response.schools.sort((a, b) => lexOrd(a.schoolName, b.schoolName));

  return response;
}
