import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import jwtDecode from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

import { getMajorAudit, getMapping, getMinorAudit } from "./lib";
import type { Block } from "./types";

import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env["X_AUTH_TOKEN"]) throw new Error("Auth cookie not set.");
  const studentId = jwtDecode<JwtPayload>(process.env["X_AUTH_TOKEN"].slice(7))?.sub;
  if (!studentId) throw new Error("Could not parse student ID from auth cookie.");
  const headers = {
    "Content-Type": "application/json",
    Cookie: `X-AUTH-TOKEN=${process.env["X_AUTH_TOKEN"]}`,
    Origin: "https://reg.uci.edu",
  };
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
  const catalogYear = (await getMajorAudit(
    `${currentYear}${currentYear + 1}`,
    "BS",
    "U",
    "201",
    studentId,
    headers,
  ))
    ? `${currentYear}${currentYear + 1}`
    : `${currentYear - 1}${currentYear}`;
  console.log(`Set catalogYear to ${catalogYear}`);

  const degrees = await getMapping("degrees", headers);
  console.log(`Fetched ${degrees.size} degrees`);
  const majorPrograms = await getMapping("majors", headers);
  console.log(`Fetched ${majorPrograms.size} major programs`);
  const minorPrograms = await getMapping("minors", headers);
  console.log(`Fetched ${minorPrograms.size} minor programs`);

  const undergraduateDegrees = new Set<string>();
  const graduateDegrees = new Set<string>();
  for (const degree of degrees.keys())
    (degree.startsWith("B") ? undergraduateDegrees : graduateDegrees).add(degree);

  const minorProgramRequirements = new Map<string, Block>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms.keys()) {
    const audit = await getMinorAudit(catalogYear, minorCode, studentId, headers);
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
