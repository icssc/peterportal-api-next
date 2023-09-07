import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { ZodError } from "zod";

import { APILambdaClient } from "../APILambdaClient";

const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];

const prisma = new PrismaClient();

let connected = false;
let lambdaClient: APILambdaClient;

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  if (!connected) {
    lambdaClient = await APILambdaClient.new();
    try {
      await prisma.$connect();
      connected = true;

      /**
       * TODO: handle warmer requests.
       */

      // if (request.isWarmerRequest) {
      //   return createOKResult("Warmed", headers, requestId);
      // }
    } catch {
      // no-op
    }
  }

  try {
    switch (params?.id) {
      case "terms": {
        const [gradesTerms, webSocTerms] = await Promise.all([
          connected
            ? prisma.gradesSection.findMany({
                distinct: ["year", "quarter"],
                select: {
                  year: true,
                  quarter: true,
                },
                orderBy: [{ year: "desc" }, { quarter: "desc" }],
              })
            : [],
          lambdaClient.getTerms({ function: "terms" }),
        ]);

        const shortNames = webSocTerms.map((x) => x.shortName);

        gradesTerms.forEach(({ year, quarter }) => {
          if (!shortNames.includes(`${year} ${quarter}`)) {
            let longName = year;
            switch (quarter) {
              case "Summer1":
                longName += " Summer Session 1";
                break;
              case "Summer2":
                longName += " Summer Session 2";
                break;
              case "Summer10wk":
                longName += " 10-wk Summer";
                break;
              default:
                longName += ` ${quarter} Quarter`;
                break;
            }

            webSocTerms.push({
              shortName: `${year} ${quarter}`,
              longName: longName,
            });
          }
        });

        webSocTerms.sort((a, b) => {
          if (a.shortName.substring(0, 4) > b.shortName.substring(0, 4)) return -1;
          if (a.shortName.substring(0, 4) < b.shortName.substring(0, 4)) return 1;
          return (
            quarterOrder.indexOf(b.shortName.substring(5)) -
            quarterOrder.indexOf(a.shortName.substring(5))
          );
        });

        return createOKResult(webSocTerms, headers, requestId);
      }

      case "depts": {
        const [gradesDepts, webSocDepts] = await Promise.all([
          connected
            ? prisma.gradesSection.findMany({
                distinct: ["department"],
                select: {
                  department: true,
                },
              })
            : [],
          lambdaClient.getDepts({ function: "depts" }),
        ]);

        const deptValues = webSocDepts.map((x) => x.deptValue);

        gradesDepts.forEach((element) => {
          if (!deptValues.includes(element.department)) {
            webSocDepts.push({
              deptLabel: element.department,
              deptValue: element.department,
            });
          }
        });

        webSocDepts.sort((a, b) => {
          if (a.deptValue == "ALL") return -1;
          if (b.deptValue == "ALL") return 1;
          if (a.deptValue > b.deptValue) return 1;
          if (a.deptValue < b.deptValue) return -1;
          return 0;
        });

        return createOKResult(webSocDepts, headers, requestId);
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }

  return createErrorResult(400, "Invalid endpoint", requestId);
};