import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import jwtDecode from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

import { AuditParser } from "./AuditParser";
import { DegreeworksClient } from "./DegreeworksClient";
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
  const dw = await DegreeworksClient.new(studentId, headers);
  const degrees = await dw.getMapping("degrees");
  console.log(`Fetched ${degrees.size} degrees`);
  const majorPrograms = new Set((await dw.getMapping("majors")).keys());
  console.log(`Fetched ${majorPrograms.size} major programs`);
  const minorPrograms = new Set((await dw.getMapping("minors")).keys());
  console.log(`Fetched ${minorPrograms.size} minor programs`);

  const undergraduateDegrees = new Set<string>();
  const graduateDegrees = new Set<string>();
  for (const degree of degrees.keys())
    (degree.startsWith("B") ? undergraduateDegrees : graduateDegrees).add(degree);

  const ap = await AuditParser.new();
  const parsedMinorPrograms = new Map<string, Program>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms) {
    const audit = await dw.getMinorAudit(minorCode);
    if (!audit) {
      console.log(`Requirements block not found (minorCode = ${minorCode})`);
      continue;
    }
    parsedMinorPrograms.set(`U-MINOR-${minorCode}`, ap.parseBlock(audit));
    console.log(
      `Requirements block found and parsed for "${audit.title}" (minorCode = ${minorCode})`,
    );
  }
  const parsedMajorsAndSpecs = new Map<string, Program>();
  const degreesAwarded = new Map<string, string>();
  console.log("Scraping undergraduate program requirements");
  for (const degree of undergraduateDegrees) {
    for (const majorCode of majorPrograms) {
      const audit = await dw.getMajorAudit(degree, "U", majorCode);
      if (!audit) {
        console.log(`Requirements block not found (majorCode = ${majorCode}, degree = ${degree})`);
        continue;
      }
      degreesAwarded.set(degree, degrees.get(degree) ?? "");
      parsedMajorsAndSpecs.set(`U-MAJOR-${majorCode}-${degree}`, ap.parseBlock(audit));
      console.log(
        `Requirements block found and parsed for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
      );
    }
  }
  console.log("Scraping graduate program requirements");
  for (const degree of graduateDegrees) {
    for (const majorCode of majorPrograms) {
      const audit = await dw.getMajorAudit(degree, "G", majorCode);
      if (!audit) {
        console.log(`Requirements block not found (majorCode = ${majorCode}, degree = ${degree})`);
        continue;
      }
      degreesAwarded.set(degree, degrees.get(degree) ?? "");
      parsedMajorsAndSpecs.set(`G-MAJOR-${majorCode}-${degree}`, ap.parseBlock(audit));
      console.log(
        `Requirements block found and parsed for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
      );
    }
  }
  console.log("Scraping all specialization requirements");
  for (const [blockId, { specs }] of parsedMajorsAndSpecs) {
    const { school, code: majorCode, degreeType: degree } = ap.parseBlockId(blockId);
    if (!degree) throw new Error(`Could not parse degree type from malformed blockId "${blockId}"`);
    for (const specCode of specs) {
      const audit = await dw.getSpecAudit(degree, school, majorCode, specCode);
      if (!audit) {
        console.log(
          `Requirements block not found (school = ${school}, majorCode = ${majorCode}, specCode = ${specCode}, degree = ${degree})`,
        );
        continue;
      }
      parsedMajorsAndSpecs.set(`${school}-SPEC-${specCode}-${degree}`, ap.parseBlock(audit));
      console.log(
        `Requirements block found and parsed for "${audit.title}" (school = ${school}, majorCode = ${majorCode}, specCode = ${specCode}, degree = ${degree})`,
      );
    }
  }
  await mkdir(join(__dirname, "../output"), { recursive: true });
  await Promise.all([
    writeFile(
      join(__dirname, "../output/parsedMinorPrograms.json"),
      JSON.stringify(Object.fromEntries(parsedMinorPrograms.entries())),
    ),
    writeFile(
      join(__dirname, "../output/parsedMajorsAndSpecs.json"),
      JSON.stringify(Object.fromEntries(parsedMajorsAndSpecs.entries())),
    ),
    writeFile(
      join(__dirname, "../output/degreesAwarded.json"),
      JSON.stringify(Object.fromEntries(degreesAwarded.entries())),
    ),
  ]);
}

main().then();
