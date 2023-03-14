import { Prisma } from "db";
import type {
  GradeDistribution,
  GradesAggregate,
  GradesRaw,
} from "peterportal-api-next-types";

import { Query } from "./schema";

const isNotPNPOnly = ({
  gradeACount,
  gradeBCount,
  gradeCCount,
  gradeDCount,
  gradeFCount,
}: GradeDistribution) =>
  gradeACount || gradeBCount || gradeCCount || gradeDCount || gradeFCount;

export function constructPrismaQuery(
  parsedQuery: Query
): Prisma.GradesSectionWhereInput {
  const {
    year,
    quarter,
    instructor,
    department,
    courseNumber,
    sectionCode,
    division,
    excludePNP,
  } = parsedQuery;
  const courseNumeric: Prisma.IntFilter = {};
  switch (division) {
    case "LowerDiv":
      courseNumeric.gte = 0;
      courseNumeric.lte = 99;
      break;
    case "UpperDiv":
      courseNumeric.gte = 100;
      courseNumeric.lte = 199;
      break;
    case "Graduate":
      courseNumeric.gte = 200;
      break;
  }
  const excludePNPFilters: Prisma.GradesSectionWhereInput = {};
  if (excludePNP) {
    excludePNPFilters.gradeACount = 0;
    excludePNPFilters.gradeBCount = 0;
    excludePNPFilters.gradeCCount = 0;
    excludePNPFilters.gradeDCount = 0;
    excludePNPFilters.gradeFCount = 0;
  }
  return {
    year,
    quarter,
    instructors: { some: { name: { contains: instructor } } },
    department,
    courseNumber,
    courseNumeric,
    sectionCode,
    ...excludePNPFilters,
  };
}

export function aggregateGrades(grades: GradesRaw): GradesAggregate {
  return {
    sectionList: grades.map(
      ({
        year,
        quarter,
        sectionCode,
        department,
        courseNumber,
        courseNumeric,
        instructors,
      }) => ({
        year,
        quarter,
        sectionCode,
        department,
        courseNumber,
        courseNumeric,
        instructors,
      })
    ),
    gradeDistribution: {
      ...(Object.fromEntries(
        (
          [
            "gradeACount",
            "gradeBCount",
            "gradeCCount",
            "gradeDCount",
            "gradeFCount",
            "gradePCount",
            "gradeNPCount",
            "gradeWCount",
          ] as (keyof GradeDistribution)[]
        ).map((key) => [key, grades.reduce((a, { [key]: b }) => a + b, 0)])
      ) as Omit<GradeDistribution, "averageGPA">),
      averageGPA:
        grades.reduce((a, { averageGPA: b }) => a + b, 0) /
        grades.filter(isNotPNPOnly).length,
    },
  };
}
