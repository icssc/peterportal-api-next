// import {
//   InvocationType,
//   InvokeCommand,
//   LambdaClient,
// } from "@aws-sdk/client-lambda";
// import type {
//   APIGatewayProxyEvent,
//   APIGatewayProxyResult,
//   Context,
// } from "aws-lambda";
// import type { SortKey } from "ddb";
// import { DDBDocClient } from "ddb";
import type {
  Quarter,
  Term,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
  WebsocSectionMeeting,
} from "peterportal-api-next-types";
// import type { WebsocAPIOptions } from "websoc-api-next";
// import { callWebSocAPI } from "websoc-api-next";
// import type { ZodError } from "zod";
// import { QuerySchema } from "./websoc.dto";

/**
 * Given a nested section and all of its parent structures, returns a
 * ``WebsocAPIResponse`` object that contains only that section.
 * @param school The school that the department belongs to.
 * @param department The department that the course belongs to.
 * @param course The course that the section belongs to.
 * @param section The section to isolate.
 */
const isolateSection = (
  school: WebsocSchool,
  department: WebsocDepartment,
  course: WebsocCourse,
  section: WebsocSection
): WebsocAPIResponse => ({
  schools: [
    {
      ...school,
      departments: [
        {
          ...department,
          courses: [
            {
              ...course,
              sections: [section],
            },
          ],
        },
      ],
    },
  ],
});
