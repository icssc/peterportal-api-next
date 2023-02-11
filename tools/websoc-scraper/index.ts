import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import { PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { DDBDocClient, Key } from "ddb";
import {
  GE,
  geCategories,
  Quarter,
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
} from "peterportal-api-next-types";
import { getTermDateData } from "registrar-api";
import { callWebSocAPI, getDepts, getTerms } from "websoc-api-next";

const combineResponses = (
  responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  const combined = responses.shift();
  if (!combined) return { schools: [] };
  for (const res of responses) {
    for (const school of res.schools) {
      const schoolIndex = combined.schools.findIndex(
        (s) => s.schoolName === school.schoolName
      );
      if (schoolIndex !== -1) {
        for (const dept of school.departments) {
          const deptIndex = combined.schools[schoolIndex].departments.findIndex(
            (d) => d.deptCode === dept.deptCode
          );
          if (deptIndex !== -1) {
            const courseSet = new Set(
              combined.schools[schoolIndex].departments[deptIndex].courses
            );
            for (const course of dept.courses) {
              courseSet.add(course);
            }
            combined.schools[schoolIndex].departments[deptIndex].courses =
              Array.from(courseSet);
          } else {
            combined.schools[schoolIndex].departments.push(dept);
          }
        }
      } else {
        combined.schools.push(school);
      }
    }
  }
  return combined;
};

const reparentSection = (
  school: WebsocSchool,
  department: WebsocDepartment,
  course: WebsocCourse,
  section: WebsocSection
): { data: WebsocAPIResponse; deptCode: string; sectionCode: string } => {
  const data = { schools: [{ ...school }] };
  const { deptCode } = department;
  const { sectionCode } = section;
  data.schools[0].departments = [{ ...department }];
  data.schools[0].departments[0].courses = [{ ...course }];
  data.schools[0].departments[0].courses[0].sections = [{ ...section }];
  return { data, deptCode, sectionCode };
};

const shortNameToTerm = (shortName: string): Term => {
  const [year, q] = shortName.split(" ");
  return {
    year,
    quarter: q as Quarter,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const handler = async () => {
  const docClient = new DDBDocClient();

  /* Determine which term(s) we're scraping. */

  const now = new Date();
  let currentYear = now.getFullYear().toString();
  let currentTerms = await getTermDateData(currentYear);
  if (now <= currentTerms[`${currentYear} Fall`].instructionStart) {
    currentYear = (parseInt(currentYear) - 1).toString();
    currentTerms = await getTermDateData(currentYear);
  }
  const termsToScrape = (await getTerms())
    .map((x) => x.shortName)
    .filter((x) => x in currentTerms && now <= currentTerms[x].finalsEnd);
  const allDepts = (await getDepts())
    .map((x) => x.deptValue)
    .filter((x) => x !== "ALL");
  for (const t of termsToScrape) {
    /* Scrape data pertaining to all departments and GE categories for each term. */

    const term = shortNameToTerm(t);
    const deptResponses: WebsocAPIResponse[] = [];
    for (const department of allDepts) {
      const res = await callWebSocAPI(term, { department });
      await sleep(1000);
      deptResponses.push(res);
    }
    const geResponses: Record<string, WebsocAPIResponse> = {};
    for (const ge of Object.keys(geCategories)) {
      const res = await callWebSocAPI(term, { ge: ge as GE });
      await sleep(1000);
      geResponses[ge] = res;
    }

    /* Check if all required DynamoDB tables exist. If not, create them. */

    const termString = `${term.year}-${term.quarter.toLowerCase()}`;
    const tables: Record<string, Key[]> = {
      "api-next-websoc-instructors": [
        {
          name: "term",
          type: ScalarAttributeType.S,
        },
      ],
      [`api-next-websoc-${termString}-main`]: [
        {
          name: "sectionCode",
          type: ScalarAttributeType.S,
        },
      ],
      [`api-next-websoc-${termString}-by-department`]: [
        {
          name: "deptCode",
          type: ScalarAttributeType.S,
        },
        {
          name: "sectionCode",
          type: ScalarAttributeType.S,
        },
      ],
      [`api-next-websoc-${termString}-by-instructor`]: [
        {
          name: "instructor",
          type: ScalarAttributeType.S,
        },
        {
          name: "sectionCode",
          type: ScalarAttributeType.S,
        },
      ],
      [`api-next-websoc-${termString}-by-ge`]: [
        {
          name: "geCategory",
          type: ScalarAttributeType.S,
        },
        {
          name: "sectionCode",
          type: ScalarAttributeType.S,
        },
      ],
    };
    const missingTables: string[] = [];
    for (const tableName of Object.keys(tables)) {
      try {
        await docClient.describeTable(tableName);
      } catch {
        missingTables.push(tableName);
      }
    }
    for (const tableName of missingTables) {
      await docClient.createTable(
        tableName,
        tables[tableName][0],
        tables[tableName][1]
      );
    }

    /* Create the put operations and then execute them in parallel with Promise.all(). */

    const promises: Promise<PutCommandOutput>[] = [];
    const instructors: Set<string> = new Set();
    for (const school of combineResponses(deptResponses).schools) {
      for (const department of school.departments) {
        for (const course of department.courses) {
          for (const section of course.sections) {
            const { data, deptCode, sectionCode } = reparentSection(
              school,
              department,
              course,
              section
            );
            promises.push(
              docClient.put(`api-next-websoc-${termString}-main`, {
                sectionCode,
                data,
              }),
              docClient.put(`api-next-websoc-${termString}-by-department`, {
                sectionCode,
                deptCode,
                data,
              }),
              ...section.instructors.map((instructor) => {
                instructors.add(instructor);
                return docClient.put(
                  `api-next-websoc-${termString}-by-instructor`,
                  {
                    sectionCode,
                    instructor,
                    data,
                  }
                );
              })
            );
          }
        }
      }
    }
    for (const [geCategory, response] of Object.entries(geResponses)) {
      for (const school of response.schools) {
        for (const department of school.departments) {
          for (const course of department.courses) {
            for (const section of course.sections) {
              const { data, sectionCode } = reparentSection(
                school,
                department,
                course,
                section
              );
              promises.push(
                docClient.put(`api-next-websoc-${termString}-by-ge`, {
                  geCategory,
                  sectionCode,
                  data,
                })
              );
            }
          }
        }
      }
    }
    promises.push(
      docClient.put("api-next-websoc-instructors", {
        term: t,
        instructors,
      })
    );
    await Promise.all(promises);
  }
};
