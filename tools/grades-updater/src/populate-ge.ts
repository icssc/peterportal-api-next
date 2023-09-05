import { Prisma, PrismaClient } from "@libs/db";
import { callWebSocAPI, GE, geCodes, Quarter } from "@libs/websoc-api-next";

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "info" },
    { emit: "stdout", level: "warn" },
  ],
});

prisma.$on("query", (e) => {
  console.log("Query: " + e.query);
  console.log("Params: " + e.params);
  console.log("Duration: " + e.duration + "ms");
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const log = (msg: string) => console.log(`[${new Date().toUTCString()}] ${msg}`);

function categorySetToMask(geCategories: Set<GE>) {
  let ret = 0;
  for (const [idx, ge] of Object.entries(geCodes)) {
    if (geCategories.has(ge)) {
      ret |= 2 ** Number.parseInt(idx, 10);
    }
  }
  return ret;
}

function maskToCategorySet(mask: number) {
  const ret = new Set<GE>();
  for (const [idx, ge] of Object.entries(geCodes)) {
    if (mask & (2 ** Number.parseInt(idx, 10))) {
      ret.add(ge);
    }
  }
  return ret;
}

async function main() {
  const sections = await prisma.gradesSection.findMany({
    where: { geCategories: { equals: Prisma.AnyNull } },
    select: { year: true, quarter: true, sectionCode: true },
  });
  log(`Found ${sections.length} sections without GE data`);
  const terms = new Set(sections.map(({ year, quarter }) => `${year}-${quarter}`));
  const geData = new Map<string, Set<string>>();
  for (const term of terms) {
    const [year, quarter] = term.split("-") as [string, Quarter];
    for (const ge of geCodes) {
      log(`Getting set of section codes for (year=${year}, quarter=${quarter}, ge=${ge})`);
      const res = await callWebSocAPI({ year, quarter }, { ge });
      await sleep(1000);
      geData.set(
        `${year}-${quarter}-${ge}`,
        new Set(
          res.schools
            .flatMap((x) => x.departments)
            .flatMap((x) => x.courses)
            .flatMap((x) => x.sections)
            .map((x) => x.sectionCode),
        ),
      );
    }
  }
  const updates = new Map<number, Map<string, string[]>>();
  for (const { year, quarter, sectionCode } of sections) {
    const key = `${year}-${quarter}`;
    const geCategories = new Set<GE>();
    for (const ge of geCodes) {
      if (geData.get(`${year}-${quarter}-${ge}`)?.has(sectionCode)) {
        geCategories.add(ge);
      }
    }
    const mask = categorySetToMask(geCategories);
    if (updates.has(mask)) {
      if (updates.get(mask)!.has(key)) {
        updates.get(mask)!.get(key)!.push(sectionCode);
      } else {
        updates.get(mask)!.set(key, [sectionCode]);
      }
    } else {
      updates.set(mask, new Map([[key, [sectionCode]]]));
    }
  }
  const txn = [];
  for (const [mask, mapping] of updates) {
    for (const [term, sectionCodes] of mapping) {
      const [year, quarter] = term.split("-") as [string, Quarter];
      txn.push(
        prisma.gradesSection.updateMany({
          where: { year, quarter, sectionCode: { in: sectionCodes } },
          data: { geCategories: Array.from(maskToCategorySet(mask)).sort() },
        }),
      );
    }
  }
  await prisma.$transaction(txn);
}

main().then();
