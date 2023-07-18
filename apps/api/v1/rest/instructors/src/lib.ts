import type { PrismaClient, Instructor as PrismaInstructor } from "@libs/db";
import type { Instructor } from "peterportal-api-next-types";

const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];

export const normalizeInstructor = async (
  prisma: PrismaClient,
  instructor: PrismaInstructor,
): Promise<Instructor> => ({
  ...(instructor as Omit<Instructor, "courseHistory">),
  courseHistory: Object.fromEntries(
    Object.entries(
      (
        await prisma.courseHistory.findMany({
          where: { ucinetid: instructor.ucinetid },
          select: { courseId: true, term: true },
        })
      ).reduce(
        (prev, curr) => {
          prev[curr.courseId] = [...(prev[curr.courseId] ?? []), curr.term];
          return prev;
        },
        {} as Record<string, string[]>,
      ),
    ).map(([courseId, term]) => [
      courseId,
      term.sort((a, b) => {
        if (a.substring(0, 4) > b.substring(0, 4)) return -1;
        if (a.substring(0, 4) < b.substring(0, 4)) return 1;
        return quarterOrder.indexOf(b.substring(5)) - quarterOrder.indexOf(a.substring(5));
      }),
    ]),
  ),
});
