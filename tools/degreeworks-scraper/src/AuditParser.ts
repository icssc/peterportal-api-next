import type { Course } from "peterportal-api-next-types";

import { PPAPIOfflineClient } from "./PPAPIOfflineClient";
import type { Block, Program, ProgramId, Requirement, Rule } from "./types";

export class AuditParser {
  private static electiveMatcher = /ELECTIVE @+/;
  private static wildcardMatcher = /\w@/;
  private static rangeMatcher = /-\w+/;

  /**
   * This will always be properly initialized using the static async factory function (`new()`).
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore TS2564
  private ppapi: PPAPIOfflineClient;

  private constructor() {}

  static async new(): Promise<AuditParser> {
    const ap = new AuditParser();
    ap.ppapi = await PPAPIOfflineClient.new();
    console.log("[AuditParser.new] AuditParser initialized");
    return ap;
  }

  parseBlock = (block: Block): Program => ({
    name: block.title,
    requirements: this.ruleArrayToRequirements(block.ruleArray),
    specs: this.parseSpecs(block.ruleArray),
  });

  lexOrd = new Intl.Collator().compare;

  parseSpecs = (ruleArray: Rule[]) =>
    ruleArray
      .filter((x) => x.ruleType === "IfStmt")
      .flatMap((x) => this.ifStmtToSpecArray([x]))
      .sort();

  ifStmtToSpecArray(ruleArray: Rule[]): string[] {
    const ret = [];
    for (const rule of ruleArray) {
      switch (rule.ruleType) {
        case "IfStmt":
          ret.push(
            ...this.ifStmtToSpecArray(rule.requirement.ifPart.ruleArray),
            ...this.ifStmtToSpecArray(rule.requirement.elsePart?.ruleArray ?? []),
          );
          break;
        case "Block":
          ret.push(rule.requirement.value);
          break;
      }
    }
    return ret;
  }

  flattenIfStmt(ruleArray: Rule[]): Rule[] {
    const ret = [];
    for (const rule of ruleArray) {
      switch (rule.ruleType) {
        case "IfStmt":
          ret.push(
            ...this.flattenIfStmt(rule.requirement.ifPart.ruleArray),
            ...this.flattenIfStmt(rule.requirement.elsePart?.ruleArray ?? []),
          );
          break;
        default:
          ret.push(rule);
      }
    }
    return ret;
  }

  normalizeCourseId(courseIdLike: string): Course[] {
    // "ELECTIVE @" is typically used as a pseudo-course and can be safely ignored.
    if (courseIdLike.match(AuditParser.electiveMatcher)) return [];
    const [department, courseNumber] = courseIdLike.split(" ");
    if (courseNumber.match(AuditParser.wildcardMatcher)) {
      // Wildcard course numbers.
      return this.ppapi.getCoursesByDepartment(
        department,
        (x) =>
          !!x.courseNumber.match(
            new RegExp(
              "^" +
                courseNumber.replace(
                  /@+/g,
                  `.{${[...courseNumber].filter((y) => y === "@").length},}`,
                ),
            ),
          ),
      );
    }
    if (courseNumber.match(AuditParser.rangeMatcher)) {
      // Course number ranges.
      const [minCourseNumber, maxCourseNumber] = courseNumber.split("-");
      return this.ppapi.getCoursesByDepartment(
        department,
        (x) =>
          x.courseNumeric >= Number.parseInt(minCourseNumber, 10) &&
          x.courseNumeric <= Number.parseInt(maxCourseNumber, 10),
      );
    }
    // Probably a normal course, just make sure that it exists.
    const course = this.ppapi.getCourse(`${department}${courseNumber}`);
    return course ? [course] : [];
  }

  ruleArrayToRequirements(ruleArray: Rule[]) {
    const ret: Record<string, Requirement> = {};
    for (const rule of ruleArray) {
      switch (rule.ruleType) {
        case "Block":
          break;
        case "Noncourse":
          break;
        case "Course": {
          const includedCourses = rule.requirement.courseArray.map(
            (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
          );
          const toInclude = new Map<string, Course>(
            includedCourses.flatMap(this.normalizeCourseId.bind(this)).map((x) => [x.id, x]),
          );
          const excludedCourses =
            rule.requirement.except?.courseArray.map(
              (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
            ) ?? [];
          const toExclude = new Set<string>(
            excludedCourses.flatMap(this.normalizeCourseId.bind(this)).map((x) => x.id),
          );
          const courses = Array.from(toInclude)
            .filter(([x]) => !toExclude.has(x))
            .sort(([, a], [, b]) =>
              a.department === b.department
                ? a.courseNumeric - b.courseNumeric || this.lexOrd(a.courseNumber, b.courseNumber)
                : this.lexOrd(a.department, b.department),
            )
            .map(([x]) => x);
          if (rule.requirement.classesBegin) {
            ret[rule.label] = {
              requirementType: "Course",
              courseCount: Number.parseInt(rule.requirement.classesBegin, 10),
              courses,
            };
          } else if (rule.requirement.creditsBegin) {
            ret[rule.label] = {
              requirementType: "Unit",
              unitCount: Number.parseInt(rule.requirement.creditsBegin, 10),
              courses,
            };
          }
          break;
        }
        case "Group":
          ret[rule.label] = {
            requirementType: "Group",
            requirementCount: Number.parseInt(rule.requirement.numberOfGroups),
            requirements: this.ruleArrayToRequirements(rule.ruleArray),
          };
          break;
        case "IfStmt": {
          const rules = this.flattenIfStmt([rule]);
          if (rules.length > 1 && !rules.some((x) => x.ruleType === "Block")) {
            ret["Select 1 of the following"] = {
              requirementType: "Group",
              requirementCount: 1,
              requirements: this.ruleArrayToRequirements(rules),
            };
          }
          break;
        }
      }
    }
    return ret;
  }

  parseBlockId(blockId: string) {
    const [school, programType, code, degreeType] = blockId.split("-");
    return { school, programType, code, degreeType } as ProgramId;
  }
}
