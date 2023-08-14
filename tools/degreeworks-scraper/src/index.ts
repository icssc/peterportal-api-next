import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fetch from "cross-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The base type for all `Rule` objects.
 */
type RuleBase = { label: string };
/**
 * A group of `numberOfRules` rules,
 * of which `numberOfGroups` must be satisfied
 * in order to fulfill this rule.
 */
type RuleGroup = {
  ruleType: "Group";
  requirement: { numberOfGroups: string; numberOfRules: string };
  ruleArray: Rule[];
};
/**
 * An object that represents a (range of) course(s).
 */
type Course = { discipline: string; number: string; numberEnd?: string };
/**
 * A rule that is fulfilled by taking `creditsBegin` units
 * and/or `classesBegin` courses from the `courseArray`.
 */
type RuleCourse = {
  ruleType: "Course";
  requirement: { creditsBegin?: string; classesBegin?: string; courseArray: Course[] };
};
/**
 * A rule that has different requirements depending on some boolean condition.
 * This seems to be used to denote all specializations that can be applied to a major.
 */
type RuleIfStmt = {
  ruleType: "IfStmt";
  requirement: { ifPart: { ruleArray: Rule[] }; elsePart?: { ruleArray: Rule[] } };
};
/**
 * A rule that refers to another block (typically a specialization).
 */
type RuleBlock = {
  ruleType: "Block";
  requirement: { numBlocks: string; type: string; value: string };
};
/**
 * A rule that is not a course.
 * This seems to be only used by Engineering majors
 * that have a design unit requirement.
 */
type RuleNoncourse = {
  ruleType: "Noncourse";
  requirement: { numNoncourses: string; code: string };
};
type Rule = RuleBase & (RuleGroup | RuleCourse | RuleIfStmt | RuleBlock | RuleNoncourse);
type Block = {
  requirementType: string;
  requirementValue: string;
  title: string;
  ruleArray: Rule[];
};
type DWAuditOKResponse = { blockArray: Block[] };
type DWAuditErrorResponse = { error: never };
/**
 * The type of the DegreeWorks audit response.
 */
type DWAuditResponse = DWAuditOKResponse | DWAuditErrorResponse;

type DWMappingResponse<T extends string> = {
  _embedded: { [P in T]: { key: string; description: string }[] };
};

const DW_API_URL = "https://reg.uci.edu/RespDashboard/api";
const AUDIT_URL = `${DW_API_URL}/audit`;
const HEADERS = {
  "Content-Type": "application/json",
  Cookie: `X-AUTH-TOKEN=${process.env["X_AUTH_TOKEN"]}`,
  Origin: "https://reg.uci.edu",
};
const DELAY = 1000;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // const undergraduateDegrees = new Map(
  //   [...degrees.entries()].filter(([k, _]) => k.startsWith("B")),
  // );
  // const graduateDegrees = new Map([...degrees.entries()].filter(([k, _]) => !k.startsWith("B")));

  const minorProgramRequirements = new Map<string, Block>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms.keys()) {
    const audit = await getMinorAudit(catalogYear, minorCode);
    if (!audit) {
      console.log(`Minor program not found for code ${minorCode}`);
      continue;
    }
    console.log(`Requirements block for "${audit.title}" found for code ${minorCode}`);
    minorProgramRequirements.set(minorCode, {
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
