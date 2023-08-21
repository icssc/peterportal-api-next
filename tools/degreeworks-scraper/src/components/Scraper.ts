import { Program } from "../types";

import { AuditParser } from "./AuditParser";
import { DegreeworksClient } from "./DegreeworksClient";

export class Scraper {
  private ap!: AuditParser;
  private dw!: DegreeworksClient;

  private degrees: Map<string, string> | undefined = undefined;
  private majorPrograms: Set<string> | undefined = undefined;
  private minorPrograms: Set<string> | undefined = undefined;

  private done = false;
  private parsedMinorPrograms: Map<string, Program> | undefined = undefined;
  private parsedUgradPrograms: Map<string, Program> | undefined = undefined;
  private parsedGradPrograms: Map<string, Program> | undefined = undefined;
  private parsedSpecializations: Map<string, Program> | undefined = undefined;
  private degreesAwarded: Map<string, string> | undefined = undefined;

  private constructor() {}

  private async scrapePrograms(school: string, degrees: Set<string>) {
    if (!this.majorPrograms) throw new Error("majorPrograms has not yet been initialized.");
    const ret = new Map<string, Program>();
    for (const degree of degrees) {
      for (const majorCode of this.majorPrograms) {
        const audit = await this.dw.getMajorAudit(degree, school, majorCode);
        if (!audit) {
          console.log(
            `Requirements block not found (majorCode = ${majorCode}, degree = ${degree})`,
          );
          continue;
        }
        if (ret.has(audit.title)) {
          console.log(
            `Requirements block already exists for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
          );
          continue;
        }
        ret.set(audit.title, this.ap.parseBlock(`${school}-MAJOR-${majorCode}-${degree}`, audit));
        console.log(
          `Requirements block found and parsed for "${audit.title}" (majorCode = ${majorCode}, degree = ${degree})`,
        );
      }
    }
    return ret;
  }
  async run() {
    if (this.done) throw new Error("This scraper instance has already finished its run.");
    this.degrees = await this.dw.getMapping("degrees");
    console.log(`Fetched ${this.degrees.size} degrees`);
    this.majorPrograms = new Set((await this.dw.getMapping("majors")).keys());
    console.log(`Fetched ${this.majorPrograms.size} major programs`);
    this.minorPrograms = new Set((await this.dw.getMapping("minors")).keys());
    console.log(`Fetched ${this.minorPrograms.size} minor programs`);
    const ugradDegrees = new Set<string>();
    const gradDegrees = new Set<string>();
    for (const degree of this.degrees.keys())
      (degree.startsWith("B") ? ugradDegrees : gradDegrees).add(degree);
    this.parsedMinorPrograms = new Map<string, Program>();
    console.log("Scraping minor program requirements");
    for (const minorCode of this.minorPrograms) {
      const audit = await this.dw.getMinorAudit(minorCode);
      if (!audit) {
        console.log(`Requirements block not found (minorCode = ${minorCode})`);
        continue;
      }
      this.parsedMinorPrograms.set(audit.title, this.ap.parseBlock(`U-MINOR-${minorCode}`, audit));
      console.log(
        `Requirements block found and parsed for "${audit.title}" (minorCode = ${minorCode})`,
      );
    }
    console.log("Scraping undergraduate program requirements");
    this.parsedUgradPrograms = await this.scrapePrograms("U", ugradDegrees);
    console.log("Scraping graduate program requirements");
    this.parsedGradPrograms = await this.scrapePrograms("G", gradDegrees);
    this.parsedSpecializations = new Map<string, Program>();
    console.log("Scraping all specialization requirements");
    for (const [, { specs, school, code: majorCode, degreeType: degree }] of [
      ...this.parsedUgradPrograms,
      ...this.parsedGradPrograms,
    ]) {
      if (!degree) throw new Error("Degree type is undefined");
      for (const specCode of specs) {
        const audit = await this.dw.getSpecAudit(degree, school, majorCode, specCode);
        if (!audit) {
          console.log(
            `Requirements block not found (school = ${school}, majorCode = ${majorCode}, specCode = ${specCode}, degree = ${degree})`,
          );
          continue;
        }
        this.parsedSpecializations.set(
          specCode,
          this.ap.parseBlock(`${school}-SPEC-${specCode}-${degree}`, audit),
        );
        console.log(
          `Requirements block found and parsed for "${audit.title}" (specCode = ${specCode})`,
        );
      }
    }
    this.degreesAwarded = new Map(
      Array.from(
        new Set(
          [...this.parsedUgradPrograms, ...this.parsedGradPrograms]
            .map(([, x]) => x.degreeType)
            .filter((x) => x) as string[],
        ),
      ).map((x) => [x, this.degrees?.get(x) as string]),
    );
    this.done = true;
  }
  get() {
    if (!this.done) throw new Error("This scraper instance has not yet finished its run.");
    return new Map(
      Object.entries({
        parsedMinorPrograms: this.parsedMinorPrograms,
        parsedUgradPrograms: this.parsedUgradPrograms,
        parsedGradPrograms: this.parsedGradPrograms,
        parsedSpecializations: this.parsedSpecializations,
        degreesAwarded: this.degreesAwarded,
      }),
    ) as Map<string, Map<string, Program>>;
  }
  static async new(studentId: string, headers: HeadersInit): Promise<Scraper> {
    const scraper = new Scraper();
    scraper.ap = await AuditParser.new();
    scraper.dw = await DegreeworksClient.new(studentId, headers);
    return scraper;
  }
}
