import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import jwtDecode from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

import { getMajorAudit, getMapping, getMinorAudit, parseBlock } from "./lib";
import type { Program } from "./types";

import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env["X_AUTH_TOKEN"]) throw new Error("Auth cookie not set.");
  const studentId = jwtDecode<JwtPayload>(process.env["X_AUTH_TOKEN"].slice("Bearer+".length))?.sub;
  if (!studentId || studentId.length !== 8)
    throw new Error("Could not parse student ID from auth cookie.");
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
  const majorPrograms = new Set((await getMapping("majors", headers)).keys());
  console.log(`Fetched ${majorPrograms.size} major programs`);
  const minorPrograms = new Set((await getMapping("minors", headers)).keys());
  console.log(`Fetched ${minorPrograms.size} minor programs`);

  const undergraduateDegrees = new Set<string>();
  const graduateDegrees = new Set<string>();
  for (const degree of degrees.keys())
    (degree.startsWith("B") ? undergraduateDegrees : graduateDegrees).add(degree);

  const parsedMinorPrograms = new Map<string, Program>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms) {
    const audit = await getMinorAudit(catalogYear, minorCode, studentId, headers);
    if (!audit) {
      console.log(`Minor program not found for code ${minorCode}`);
      continue;
    }
    console.log(`Requirements block for "${audit.title}" found for code ${minorCode}`);
    parsedMinorPrograms.set(`U-MINOR-${minorCode}`, await parseBlock(audit));
  }
  await mkdir(join(__dirname, "../output"), { recursive: true });
  await writeFile(
    join(__dirname, "../output/parsedMinorPrograms.json"),
    JSON.stringify(Object.fromEntries(parsedMinorPrograms.entries())),
  );
}

main().then();
