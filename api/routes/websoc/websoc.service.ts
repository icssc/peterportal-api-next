import hash from "object-hash";
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
 * Combines all given response objects into a single response object,
 * eliminating duplicates and merging substructures.
 * @param responses The responses to combine.
 */
export const combineResponses = (
  responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  /**
   * all sections are enhanced with contextual info from parent structures
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
                    .map((section) => ({
                      school,
                      department,
                      course,
                      section,
                    }))
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

  /**
   * all sections have been located properly in the combined structure,
   * calculate the meetings for each section
   * TODO: maybe this can be simplified too?
   */
  schools.forEach((s) => {
    s.departments.forEach((d) => {
      d.courses.forEach((c) => {
        c.sections.forEach((e) => {
          const meetingsHashSet: Record<string, WebsocSectionMeeting> = {};
          for (const meeting of e.meetings) {
            const meetingHash = hash([meeting.days, meeting.time]);
            if (meetingHash in meetingsHashSet) {
              meetingsHashSet[meetingHash].bldg.push(meeting.bldg[0]);
            } else {
              meetingsHashSet[meetingHash] = { ...meeting };
            }
            e.meetings = Object.values(meetingsHashSet);
          }
        });
      });
    });
  });

  return { schools };
};
