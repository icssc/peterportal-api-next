import fetch from "cross-fetch";
import { isErrorResponse } from "peterportal-api-next-types";
import type { Course, RawResponse } from "peterportal-api-next-types";

import type {
  Block,
  DWAuditResponse,
  DWMappingResponse,
  Program,
  ProgramId,
  Requirement,
  Rule,
} from "./types";

const PPAPI_REST_URL = "https://api-next.peterportal.org/v1/rest";
const DW_API_URL = "https://reg.uci.edu/RespDashboard/api";
const AUDIT_URL = `${DW_API_URL}/audit`;
const DELAY = 1000;

const electiveMatcher = /ELECTIVE @+/;
const wildcardMatcher = /\d+@+/;
const rangeMatcher = /\d+-\d+/;

const lexOrd = new Intl.Collator().compare;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function getCourse(courseNumber: string): Promise<Course | undefined> {
  const res = await fetch(`${PPAPI_REST_URL}/courses/${courseNumber}`);
  await sleep(DELAY);
  const json: RawResponse<Course> = await res.json();
  return isErrorResponse(json) ? undefined : json.payload;
}

async function getCourses(
  department: string,
  predicate: (x: Course) => boolean,
): Promise<Course[] | undefined> {
  const res = await fetch(`${PPAPI_REST_URL}/courses/?department=${department}`);
  await sleep(DELAY);
  const json: RawResponse<Course[]> = await res.json();
  return isErrorResponse(json) ? undefined : json.payload.filter(predicate);
}

async function normalizeCourseId(courseIdLike: string): Promise<Course[]> {
  // "ELECTIVE @" is typically used as a pseudo-course and can be safely ignored.
  if (courseIdLike.match(electiveMatcher)) return [];
  const [department, courseNumber] = courseIdLike.split(" ");
  if (courseNumber.match(wildcardMatcher)) {
    // Wildcard course numbers.
    const courseIds = await getCourses(
      department,
      (x) => !!x.courseNumber.match(new RegExp(courseNumber.replace(/@/g, "."))),
    );
    return courseIds ? courseIds : [];
  }
  if (courseNumber.match(rangeMatcher)) {
    // Course number ranges.
    const [minCourseNumber, maxCourseNumber] = courseNumber.split("-");
    const courseIds = await getCourses(
      department,
      (x) =>
        x.courseNumeric >= Number.parseInt(minCourseNumber, 10) &&
        x.courseNumeric <= Number.parseInt(maxCourseNumber, 10),
    );
    return courseIds ? courseIds : [];
  }
  // Probably a normal course, just make sure that it exists.
  const courseId = await getCourse(`${department}${courseNumber}`);
  return courseId ? [courseId] : [];
}

async function ruleArrayToRequirements(ruleArray: Rule[]) {
  const ret: Record<string, Requirement> = {};
  for (const rule of ruleArray) {
    switch (rule.ruleType) {
      case "Course": {
        const includedCourses = rule.requirement.courseArray.map(
          (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
        );
        const toInclude = new Set<Course>();
        for (const id of includedCourses) {
          (await normalizeCourseId(id)).forEach((x) => toInclude.add(x));
        }
        const excludedCourses =
          rule.requirement.except?.courseArray.map(
            (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
          ) ?? [];
        const toExclude = new Set<string>();
        for (const id of excludedCourses) {
          (await normalizeCourseId(id)).map((x) => x.id).forEach((x) => toExclude.add(x));
        }
        const courses = Array.from(toInclude)
          .filter((x) => !toExclude.has(x.id))
          .sort((a, b) =>
            a.department === b.department
              ? a.courseNumeric - b.courseNumeric
              : lexOrd(a.department, b.department),
          )
          .map((x) => x.id);
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
          requirements: await ruleArrayToRequirements(rule.ruleArray),
        };
        break;
      case "IfStmt": {
        const rules = flattenIfStmt([rule]);
        if (rules.length > 1 && !rules.find((x) => x.ruleType === "Block")) {
          ret["Select 1 of the following"] = {
            requirementType: "Group",
            requirementCount: 1,
            requirements: await ruleArrayToRequirements(rules),
          };
        }
        break;
      }
    }
  }
  return ret;
}

export const parseBlock = async (block: Block): Promise<Program> => ({
  name: block.title,
  requirements: await ruleArrayToRequirements(block.ruleArray),
  specs: parseSpecs(block.ruleArray),
});

export async function getMajorAudit(
  catalogYear: string,
  degree: string,
  school: string,
  majorCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree,
      school,
      studentId,
      classes: [],
      goals: [{ code: "MAJOR", value: majorCode }],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MAJOR" && x.requirementValue === majorCode,
      );
}

export async function getMinorAudit(
  catalogYear: string,
  minorCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      studentId,
      degree: "BA",
      school: "U",
      classes: [],
      goals: [
        { code: "MAJOR", value: "000" },
        { code: "MINOR", value: minorCode },
      ],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MINOR" && x.requirementValue === minorCode,
      );
}

export async function getSpecAudit(
  catalogYear: string,
  degree: string,
  school: string,
  majorCode: string,
  specCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree,
      school,
      studentId,
      classes: [],
      goals: [
        { code: "MAJOR", value: majorCode },
        { code: "SPEC", value: specCode },
      ],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find((x) => x.requirementType === "SPEC" && x.requirementValue === specCode);
}

export async function getMapping<T extends string>(
  path: T,
  headers: HeadersInit,
): Promise<Map<string, string>> {
  const res = await fetch(`${DW_API_URL}/${path}`, { headers });
  await sleep(DELAY);
  const json: DWMappingResponse<T> = await res.json();
  return new Map(json._embedded[path].map((x) => [x.key, x.description]));
}

export function parseBlockId(blockId: string) {
  const [school, programType, code, degreeType] = blockId.split("-");
  return { school, programType, code, degreeType } as ProgramId;
}
