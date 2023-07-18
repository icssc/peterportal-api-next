import { Course as PrismaCourse, CourseLevel as PrismaCourseLevel, PrismaClient } from "@libs/db";
import { Course, CourseLevel, GE, GECategory, PrerequisiteTree } from "peterportal-api-next-types";

export async function normalizeCourse(prisma: PrismaClient, course: PrismaCourse): Promise<Course> {
  let courseLevel: CourseLevel;
  switch (course.courseLevel as PrismaCourseLevel) {
    case "LowerDiv":
      courseLevel = "Lower Division (1-99)";
      break;
    case "UpperDiv":
      courseLevel = "Upper Division (100-199)";
      break;
    case "Graduate":
      courseLevel = "Graduate/Professional Only (200+)";
      break;
  }
  const geList = (course.geList as Array<Omit<GE, "ANY">>).map((x): GECategory => {
    switch (x) {
      case "GE-1A":
        return "GE Ia: Lower Division Writing";
      case "GE-1B":
        return "GE Ib: Upper Division Writing";
      case "GE-2":
        return "GE II: Science and Technology";
      case "GE-3":
        return "GE III: Social & Behavioral Sciences";
      case "GE-4":
        return "GE IV: Arts and Humanities";
      case "GE-5A":
        return "GE Va: Quantitative Literacy";
      case "GE-5B":
        return "GE Vb: Formal Reasoning";
      case "GE-6":
        return "GE VI: Language Other Than English";
      case "GE-7":
        return "GE VII: Multicultural Studies";
      case "GE-8":
        return "GE VIII: International/Global Issues";
      // this branch should never happen
      default:
        throw new Error();
    }
  });
  return {
    ...course,
    courseLevel,
    instructorHistory: course.instructorHistory as unknown as string[],
    prerequisiteTree: course.prerequisiteTree as unknown as PrerequisiteTree,
    prerequisiteList: course.prerequisiteList as unknown as string[],
    prerequisiteFor: course.prerequisiteFor as unknown as string[],
    geList,
    terms: course.terms as unknown as string[],
  };
}
