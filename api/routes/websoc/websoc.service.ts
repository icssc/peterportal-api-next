import type {
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";

/**
 * preserves context for each section
 */
interface EnhancedSection {
  school: WebsocSchool;
  department: WebsocDepartment;
  course: WebsocCourse;
  section: WebsocSection;
}

/**
 * ensure there's only one object in each nested array that's relevant for the section
 * @returns ``EnhancedSection`` object that dedupes all circular references,
 */
const isolateSection = (data: EnhancedSection): EnhancedSection => {
  const uniqueMeetings = data.section.meetings.reduce((acc, meeting) => {
    if (!acc.find((m) => m.days === meeting.days && m.time === meeting.time)) {
      acc.push(meeting);
    }
    return acc;
  }, [] as WebsocSectionMeeting[]);

  const section = {
    ...data.section,
    meetings: uniqueMeetings,
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
};

/**
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
export const combineResponses = (
  ...responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  /**
   * sections are enhanced with context of parent structures and unique meetings
   */
  const allSections: EnhancedSection[] = responses
    .map((response) =>
      response.schools
        .map((school) =>
          school.departments
            .map((department) =>
              department.courses
                .map((course) =>
                  course.sections
                    .map((section) =>
                      isolateSection({ school, department, course, section })
                    )
                    .flat()
                )
                .flat()
            )
            .flat()
        )
        .flat()
    )
    .flat();

  /**
   * for each section:
   * if one of its parent structures hasn't been declared,
   * append that structure appropriately
   */
  const schools = allSections.reduce((acc, section) => {
    const foundSchool = acc.find(
      (s) => s.schoolName === section.school.schoolName
    );
    if (!foundSchool) {
      acc.push(section.school);
      return acc;
    }

    const foundDept = foundSchool.departments.find(
      (d) => d.deptCode === section.department.deptCode
    );
    if (!foundDept) {
      foundSchool.departments.push(section.department);
      return acc;
    }

    const foundCourse = foundDept.courses.find(
      (c) =>
        c.courseNumber === section.course.courseNumber &&
        c.courseTitle === section.course.courseTitle
    );
    if (!foundCourse) {
      foundDept.courses.push(section.course);
      return acc;
    }

    const foundSection = foundCourse.sections.find(
      (s) => s.sectionCode === section.section.sectionCode
    );
    if (!foundSection) {
      foundCourse.sections.push(section.section);
      return acc;
    }

    return acc;
  }, [] as WebsocSchool[]);

  return { schools };
};
