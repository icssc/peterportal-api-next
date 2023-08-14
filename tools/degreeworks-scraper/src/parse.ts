import type { Block, Program, ProgramId, Requirement, Rule } from "./types";

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

function ruleArrayToRequirements(ruleArray: Rule[]) {
  const ret: Record<string, Requirement> = {};
  for (const rule of ruleArray) {
    switch (rule.ruleType) {
      case "Course": {
        const courses = {
          include: rule.requirement.courseArray.map(
            (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
          ),
          ...(rule.requirement.except?.courseArray && {
            exclude: rule.requirement.except.courseArray.map(
              (x) => `${x.discipline} ${x.number}${x.numberEnd ? `-${x.numberEnd}` : ""}`,
            ),
          }),
        };
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
        if (rules.length > 1 && !rules.find((x) => x.ruleType === "Block")) {
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

function parseBlockId(blockId: string) {
  const [school, programType, code, degreeType] = blockId.split("-");
  return { school, programType, code, degreeType } as ProgramId;
}

export const parseBlock = (blockId: string, block: Block): Program => ({
  ...parseBlockId(blockId),
  name: block.title,
  requirements: ruleArrayToRequirements(block.ruleArray),
  specs: parseSpecs(block.ruleArray),
});
