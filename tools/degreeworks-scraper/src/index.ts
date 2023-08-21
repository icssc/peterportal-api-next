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

async function scrapePrograms(
  ap: AuditParser,
  dw: DegreeworksClient,
  degrees: Set<string>,
  majorPrograms: Set<string>,
  school: string,
) {
  const ret = new Map<string, Program>();
  for (const degree of degrees) {
    for (const majorCode of majorPrograms) {
      const audit = await dw.getMajorAudit(degree, school, majorCode);
      if (!audit) {
        console.log(`Requirements block not found (majorCode = ${majorCode}, degree = ${degree})`);
        continue;
      }
      if (ret.has(audit.title)) {
        console.log(
          `Requirements block already exists for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
        );
        continue;
      }
      ret.set(audit.title, ap.parseBlock(`${school}-MAJOR-${majorCode}-${degree}`, audit));
      console.log(
        `Requirements block found and parsed for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
      );
    }
  }
  return ret;
}

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

  const ugradDegrees = new Set<string>();
  const gradDegrees = new Set<string>();
  for (const degree of degrees.keys())
    (degree.startsWith("B") ? ugradDegrees : gradDegrees).add(degree);

  const ap = await AuditParser.new();
  const parsedMinorPrograms = new Map<string, Program>();
  console.log("Scraping minor program requirements");
  for (const minorCode of minorPrograms) {
    const audit = await dw.getMinorAudit(minorCode);
    if (!audit) {
      console.log(`Requirements block not found (minorCode = ${minorCode})`);
      continue;
    }
    parsedMinorPrograms.set(audit.title, ap.parseBlock(`U-MINOR-${minorCode}`, audit));
    console.log(
      `Requirements block found and parsed for "${audit.title}" (minorCode = ${minorCode})`,
    );
  }
  console.log("Scraping undergraduate program requirements");
  const parsedUgradPrograms = await scrapePrograms(ap, dw, ugradDegrees, majorPrograms, "U");
  console.log("Scraping graduate program requirements");
  const parsedGradPrograms = await scrapePrograms(ap, dw, gradDegrees, majorPrograms, "G");
  const parsedSpecializations = new Map<string, Program>();
  console.log("Scraping all specialization requirements");
  for (const [, { specs, school, code: majorCode, degreeType: degree }] of [
    ...parsedUgradPrograms,
    ...parsedGradPrograms,
  ]) {
    if (!degree) throw new Error("Degree type is undefined");
    for (const specCode of specs) {
      const audit = await dw.getSpecAudit(degree, school, majorCode, specCode);
      if (!audit) {
        console.log(
          `Requirements block not found (school = ${school}, majorCode = ${majorCode}, specCode = ${specCode}, degree = ${degree})`,
        );
        continue;
      }
      parsedSpecializations.set(
        specCode,
        ap.parseBlock(`${school}-SPEC-${specCode}-${degree}`, audit),
      );
      console.log(
        `Requirements block found and parsed for "${audit.title}" (specCode = ${specCode})`,
      );
    }
  }
  const degreesAwarded = new Map(
    Array.from(
      new Set(
        [...parsedUgradPrograms, ...parsedGradPrograms]
          .map(([, x]) => x.degreeType)
          .filter((x) => x) as string[],
      ),
    ).map((x) => [x, degrees.get(x) as string]),
  );
  await mkdir(join(__dirname, "../output"), { recursive: true });
  await Promise.all([
    writeFile(
      join(__dirname, "../output/parsedMinorPrograms.json"),
      JSON.stringify(Object.fromEntries(parsedMinorPrograms.entries())),
    ),
    writeFile(
      join(__dirname, "../output/parsedUgradPrograms.json"),
      JSON.stringify(Object.fromEntries(parsedUgradPrograms.entries())),
    ),
    writeFile(
      join(__dirname, "../output/parsedGradPrograms.json"),
      JSON.stringify(Object.fromEntries(parsedGradPrograms.entries())),
    ),
    writeFile(
      join(__dirname, "../output/parsedSpecializations.json"),
      JSON.stringify(Object.fromEntries(parsedSpecializations.entries())),
    ),
    writeFile(
      join(__dirname, "../output/degreesAwarded.json"),
      JSON.stringify(Object.fromEntries(degreesAwarded.entries())),
    ),
  ]);
}

main().then();
