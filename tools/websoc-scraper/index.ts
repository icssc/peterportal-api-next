import { DDBDocClient } from "ddb";
import {
  GE,
  geCategories,
  Quarter,
  Term,
  WebsocAPIResponse,
} from "peterportal-api-next-types";
import { getTermDateData } from "registrar-api";
import { callWebSocAPI, getDepts, getTerms } from "websoc-api-next";

const combineResponses = (
  responses: WebsocAPIResponse[]
): WebsocAPIResponse => {
  const combined = responses.shift();
  if (combined === undefined) return { schools: [] };
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

export const handler = async () => {
  // const docClient = new DDBDocClient();

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
  const allDepts = (await getDepts()).map((x) => x.deptValue);
  console.log(termsToScrape);
};

handler();
