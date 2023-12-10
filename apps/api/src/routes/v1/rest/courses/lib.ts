import { Prisma } from "@libs/db";

import { Query } from "./schema";

/**
 * Constructs a Prisma query for the given filter parameters.
 * @param parsedQuery The query object parsed by Zod.
 */
export function constructPrismaQuery(parsedQuery: Query): Prisma.CourseWhereInput {
  const AND: Prisma.CourseWhereInput[] = [];

  if (parsedQuery.department)
    AND.push({
      OR: [
        { department: parsedQuery.department.toUpperCase() },
        { id: { startsWith: parsedQuery.department.toUpperCase() } },
      ],
    });

  if (parsedQuery.courseNumber) AND.push({ courseNumber: parsedQuery.courseNumber.toUpperCase() });

  if (parsedQuery.courseNumeric) AND.push({ courseNumeric: parsedQuery.courseNumeric });

  if (parsedQuery.titleContains)
    AND.push({ title: { contains: parsedQuery.titleContains, mode: "insensitive" } });

  if (parsedQuery.courseLevel && parsedQuery.courseLevel !== "ANY")
    AND.push({ courseLevel: parsedQuery.courseLevel });

  if (parsedQuery.minUnits) AND.push({ minUnits: parsedQuery.minUnits });

  if (parsedQuery.maxUnits) AND.push({ maxUnits: parsedQuery.maxUnits });

  if (parsedQuery.descriptionContains)
    AND.push({ description: { contains: parsedQuery.descriptionContains, mode: "insensitive" } });

  if (parsedQuery.taughtByInstructors)
    AND.push({
      OR: parsedQuery.taughtByInstructors.map((instructor) => ({
        instructorHistory: { array_contains: [instructor.toLowerCase()] },
      })),
    });

  if (parsedQuery.geCategory && parsedQuery.geCategory !== "ANY")
    AND.push({ geList: { array_contains: [parsedQuery.geCategory] } });

  if (parsedQuery.taughtInTerms)
    AND.push({
      OR: parsedQuery.taughtInTerms.map((term) => ({ terms: { array_contains: [term] } })),
    });

  return { AND: AND.length ? AND : undefined };
}
