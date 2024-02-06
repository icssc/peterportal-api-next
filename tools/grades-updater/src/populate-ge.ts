import { PrismaClient } from "@libs/db";
import type { GE, Quarter } from "@libs/uc-irvine-api/websoc";
import { callWebSocAPI, geCodes } from "@libs/uc-irvine-api/websoc";
import { sleep } from "@libs/utils";

const prisma = new PrismaClient();

const geKeys = [
  "isGE1A",
  "isGE1B",
  "isGE2",
  "isGE3",
  "isGE4",
  "isGE5A",
  "isGE5B",
  "isGE6",
  "isGE7",
  "isGE8",
] as const;

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

function maskToCategoryMap(mask: number) {
  const ret: Record<(typeof geKeys)[number], boolean> = {
    isGE1A: false,
    isGE1B: false,
    isGE2: false,
    isGE3: false,
    isGE4: false,
    isGE5A: false,
    isGE5B: false,
    isGE6: false,
    isGE7: false,
    isGE8: false,
  };
  for (const i of Object.keys(geCodes)) {
    const idx = Number.parseInt(i, 10);
    ret[geKeys[idx]] = !!(mask & (2 ** idx));
  }
  return ret;
}

async function main() {
  const sections = await prisma.gradesSection.findMany({
    where: { hasGEData: false },
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
          data: { hasGEData: true, ...maskToCategoryMap(mask) },
        }),
      );
    }
  }
  await prisma.$transaction(txn);
}

main().then();
