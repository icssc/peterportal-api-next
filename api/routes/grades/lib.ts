import { GradesSection, Prisma, PrismaClient } from "@libs/db";
import type {
  GradeDistribution,
  GradesAggregate,
  GradesRaw,
} from "peterportal-api-next-types";

import { Query } from "./schema";

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
export const lexOrd = (a: string, b: string): number =>
  a === b ? 0 : a > b ? 1 : -1;

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

/**
 * Given an array of sections and their grade distributions, aggregate them into
 * a single object. The ``sectionList`` is the array of sections with their
 * grade distribution information removed, and the ``gradeDistribution`` object
 * contains the sum of the number of grades given out, as well as the arithmetic
 * mean of each section's average GPA in the given dataset.
 * @param grades The array of grades to aggregate.
 */
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
