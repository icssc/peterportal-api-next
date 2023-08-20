import type { Course } from "peterportal-api-next-types";

import { PPAPIOfflineClient } from "./PPAPIOfflineClient";
import type { Block, Program, Requirement, Rule } from "./types";
import { ProgramId } from "./types";

const electiveMatcher = /ELECTIVE @+/;
const wildcardMatcher = /\w@/;
const rangeMatcher = /-\w+/;

const ppapi = new PPAPIOfflineClient();

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const parseBlock = (block: Block): Program => ({
  name: block.title,
  requirements: ruleArrayToRequirements(block.ruleArray),
  specs: parseSpecs(block.ruleArray),
});

const lexOrd = new Intl.Collator().compare;

const parseSpecs = (ruleArray: Rule[]) =>
  ruleArray
    .filter((x) => x.ruleType === "IfStmt")
    .flatMap((x) => ifStmtToSpecArray([x]))
    .sort();

function ifStmtToSpecArray(ruleArray: Rule[]): string[] {
  const ret = [];
  for (const rule of ruleArray) {
    switch (rule.ruleType) {
      case "IfStmt":
        ret.push(
          ...ifStmtToSpecArray(rule.requirement.ifPart.ruleArray),
          ...ifStmtToSpecArray(rule.requirement.elsePart?.ruleArray ?? []),
        );
        break;
      case "Block":
        ret.push(rule.requirement.value);
        break;
    }
  }
  return ret;
}

function flattenIfStmt(ruleArray: Rule[]): Rule[] {
  const ret = [];
  for (const rule of ruleArray) {
    switch (rule.ruleType) {
      case "IfStmt":
        ret.push(
          ...flattenIfStmt(rule.requirement.ifPart.ruleArray),
          ...flattenIfStmt(rule.requirement.elsePart?.ruleArray ?? []),
        );
        break;
      default:
        ret.push(rule);
    }
  }
  return ret;
}

function normalizeCourseId(courseIdLike: string): Course[] {
  // "ELECTIVE @" is typically used as a pseudo-course and can be safely ignored.
  if (courseIdLike.match(electiveMatcher)) return [];
  const [department, courseNumber] = courseIdLike.split(" ");
  if (courseNumber.match(wildcardMatcher)) {
    // Wildcard course numbers.
    const courses = ppapi.getCourses(
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
    return courses ?? [];
  }
  if (courseNumber.match(rangeMatcher)) {
    // Course number ranges.
    const [minCourseNumber, maxCourseNumber] = courseNumber.split("-");
    const courses = ppapi.getCourses(
      department,
      (x) =>
        x.courseNumeric >= Number.parseInt(minCourseNumber, 10) &&
        x.courseNumeric <= Number.parseInt(maxCourseNumber, 10),
    );
    return courses ?? [];
  }
  // Probably a normal course, just make sure that it exists.
  const course = ppapi.getCourse(`${department}${courseNumber}`);
  return course ? [course] : [];
}

function ruleArrayToRequirements(ruleArray: Rule[]) {
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
          includedCourses.flatMap(normalizeCourseId).map((x) => [x.id, x]),
        );
        const excludedCourses =
          rule.requirement.except?.courseArray.map(
            (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
          ) ?? [];
        const toExclude = new Set<string>(
          excludedCourses.flatMap(normalizeCourseId).map((x) => x.id),
        );
        const courses = Array.from(toInclude)
          .filter(([x]) => !toExclude.has(x))
          .sort(([, a], [, b]) =>
            a.department === b.department
              ? a.courseNumeric - b.courseNumeric || lexOrd(a.courseNumber, b.courseNumber)
              : lexOrd(a.department, b.department),
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
          requirements: ruleArrayToRequirements(rule.ruleArray),
        };
        break;
      case "IfStmt": {
        const rules = flattenIfStmt([rule]);
        if (rules.length > 1 && !rules.some((x) => x.ruleType === "Block")) {
          ret["Select 1 of the following"] = {
            requirementType: "Group",
            requirementCount: 1,
            requirements: ruleArrayToRequirements(rules),
          };
        }
        break;
      }
    }
  }
  return ret;
}

export function parseBlockId(blockId: string) {
  const [school, programType, code, degreeType] = blockId.split("-");
  return { school, programType, code, degreeType } as ProgramId;
}
