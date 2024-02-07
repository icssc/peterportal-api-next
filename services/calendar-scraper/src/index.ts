import { PrismaClient } from "@libs/db";
import { getTermDateData } from "@libs/uc-irvine-api/registrar";
import type { Quarter } from "@peterportal-api/types";

const prisma = new PrismaClient();

export const handler = async () => {
  const lastYear = await prisma.calendarTerm.findMany({ select: { year: true } }).then(
    (x) =>
      Array.from(new Set(x.map((y) => y.year)))
        .toSorted()
        .findLast(() => true)!,
  );
  const termDateData = await getTermDateData(lastYear);
  if (!Object.keys(termDateData).length) return;
  await prisma.calendarTerm.createMany({
    data: Object.entries(termDateData).map(([term, data]) => ({
      year: term.split(" ")[0],
      quarter: term.split(" ")[1] as Quarter,
      ...data,
    })),
  });
};
