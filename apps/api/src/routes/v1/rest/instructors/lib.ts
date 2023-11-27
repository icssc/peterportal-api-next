import { Prisma } from "@libs/db";

import { Query } from "./schema";

/**
 * Constructs a Prisma query for the given filter parameters.
 * @param parsedQuery The query object parsed by Zod.
 */
export function constructPrismaQuery(parsedQuery: Query): Prisma.InstructorWhereInput {
  const AND: Prisma.InstructorWhereInput[] = [];

  if (parsedQuery.nameContains)
    AND.push({ name: { contains: parsedQuery.nameContains, mode: "insensitive" } });

  if (parsedQuery.shortenedName)
    AND.push({ shortenedName: parsedQuery.shortenedName.toUpperCase() });

  if (parsedQuery.titleContains)
    AND.push({ title: { contains: parsedQuery.titleContains, mode: "insensitive" } });

  if (parsedQuery.departmentContains)
    AND.push({ department: { contains: parsedQuery.departmentContains, mode: "insensitive" } });

  if (parsedQuery.schoolsContains)
    AND.push({
      OR: parsedQuery.schoolsContains.map((school) => ({ schools: { array_contains: [school] } })),
    });

  if (parsedQuery.relatedDepartmentsContains)
    AND.push({
      OR: parsedQuery.relatedDepartmentsContains.map((dept) => ({
        relatedDepartments: { array_contains: [dept.toUpperCase()] },
      })),
    });

  return { AND: AND.length ? AND : undefined };
}
