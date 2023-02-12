import { PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { DDBDocClient } from "ddb";
import {
  GE,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
} from "peterportal-api-next-types";
import { callWebSocAPI } from "websoc-api-next";

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

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  if (!event.body) throw new Error("Payload not provided");
  const { term, department, ge: geCategory } = JSON.parse(event.body);
  if (!term || !department === !geCategory)
    throw new Error("Malformed payload");
  const termString = `${term.year}-${term.quarter.toLowerCase()}`;
  const docClient = new DDBDocClient();
  const promises: Promise<PutCommandOutput>[] = [];
  const instructors: Set<string> = new Set();
  if (department) {
    for (const school of (await callWebSocAPI(term, { department })).schools) {
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
              docClient.put(`api-next-websoc-${termString}-by-section-code`, {
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
  } else {
    for (const school of (await callWebSocAPI(term, { ge: geCategory as GE }))
      .schools) {
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
  await Promise.all(promises);
  return {
    statusCode: 200,
    body: JSON.stringify(Array.from(instructors)),
  };
};
