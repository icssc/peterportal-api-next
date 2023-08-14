import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fetch from "cross-fetch";

import type { Block, DWAuditResponse, DWMappingResponse } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DW_API_URL = "https://reg.uci.edu/RespDashboard/api";
const AUDIT_URL = `${DW_API_URL}/audit`;
const HEADERS = {
  "Content-Type": "application/json",
  Cookie: `X-AUTH-TOKEN=${process.env["X_AUTH_TOKEN"]}`,
  Origin: "https://reg.uci.edu",
};
const DELAY = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getMajorAudit(
  catalogYear: string,
  degree: string,
  school: string,
  majorCode: string,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree,
      school,
      classes: [],
      goals: [{ code: "MAJOR", value: majorCode }],
      studentId: process.env["STUDENT_ID"],
    }),
    headers: HEADERS,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MAJOR" && x.requirementValue === majorCode,
      );
}

async function getMinorAudit(catalogYear: string, minorCode: string): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree: "BA",
      school: "U",
      classes: [],
      goals: [
        { code: "MAJOR", value: "000" },
        { code: "MINOR", value: minorCode },
      ],
      studentId: process.env["STUDENT_ID"],
    }),
    headers: HEADERS,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MINOR" && x.requirementValue === minorCode,
      );
}

// async function getSpecAudit(
//   catalogYear: string,
//   degree: string,
//   school: string,
//   majorCode: string,
//   specCode: string,
// ): Promise<Block | undefined> {
//   const res = await fetch(AUDIT_URL, {
//     method: "POST",
//     body: JSON.stringify({
//       catalogYear,
//       degree,
//       school,
//       classes: [],
//       goals: [
//         { code: "MAJOR", value: majorCode },
//         { code: "SPEC", value: specCode },
//       ],
//       studentId: process.env["STUDENT_ID"],
//     }),
//     headers: HEADERS,
//   });
//   await sleep(DELAY);
//   const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
//   return "error" in json
//     ? undefined
//     : json.blockArray.find((x) => x.requirementType === "SPEC" && x.requirementValue === specCode);
// }

async function getMapping<T extends string>(path: T): Promise<Map<string, string>> {
  const res = await fetch(`${DW_API_URL}/${path}`, { headers: HEADERS });
  await sleep(DELAY);
  const json: DWMappingResponse<T> = await res.json();
  return new Map(json._embedded[path].map((x) => [x.key, x.description]));
}

async function main() {
  if (!process.env["STUDENT_ID"]) throw new Error("Student ID not set.");
  if (!process.env["X_AUTH_TOKEN"]) throw new Error("Auth cookie not set.");
  console.log("degreeworks-scraper starting");
  const currentYear = new Date().getUTCFullYear();
  /**
   * The current catalog year.
   *
   * Depending on when we are scraping, this may be the academic year that started
   * the previous calendar year, or the one that will start this calendar year.
   *
   * We determine the catalog year by seeing if we can fetch the major data for the
   * B.S. in Computer Science for the latter. If it is available, then we use that
   * as the catalog year. Otherwise, we use the former.
   */
  const catalogYear = (await getMajorAudit(`${currentYear}${currentYear + 1}`, "BS", "U", "201"))
    ? `${currentYear}${currentYear + 1}`
    : `${currentYear - 1}${currentYear}`;
  console.log(`Set catalogYear to ${catalogYear}`);

  const degrees = await getMapping("degrees");
  console.log(`Fetched ${degrees.size} degrees`);
  const majorPrograms = await getMapping("majors");
  console.log(`Fetched ${majorPrograms.size} major programs`);
  const minorPrograms = await getMapping("minors");
  console.log(`Fetched ${minorPrograms.size} minor programs`);

  const undergraduateDegrees = new Set<string>();
  const graduateDegrees = new Set<string>();
  for (const degree of degrees.keys())
    (degree.startsWith("B") ? undergraduateDegrees : graduateDegrees).add(degree);

  const minorProgramRequirements = new Map<string, Block>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms.keys()) {
    const audit = await getMinorAudit(catalogYear, minorCode);
    if (!audit) {
      console.log(`Minor program not found for code ${minorCode}`);
      continue;
    }
    console.log(`Requirements block for "${audit.title}" found for code ${minorCode}`);
    minorProgramRequirements.set(`U-MINOR-${minorCode}`, {
      requirementType: audit.requirementType,
      requirementValue: audit.requirementValue,
      title: audit.title,
      ruleArray: [...audit.ruleArray],
    });
  }
  await mkdir(join(__dirname, "../output"), { recursive: true });
  await writeFile(
    join(__dirname, "../output/minorProgramRequirements.json"),
    JSON.stringify(Object.fromEntries(minorProgramRequirements.entries())),
  );
}

main().then(() => []);
