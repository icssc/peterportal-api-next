import { PrismaClient } from "@libs/db";
import { createHandler } from "@libs/lambda";
import { ZodError } from "zod";

import { APILambdaClient } from "../APILambdaClient";

const quarterOrder = ["Winter", "Spring", "Summer1", "Summer10wk", "Summer2", "Fall"];

const prisma = new PrismaClient();

// let connected = false
const lambdaClient = await APILambdaClient.new();

async function onWarm() {
  await prisma.$connect();
}

export const GET = createHandler(async (event, context, res) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const params = event.pathParameters;

  try {
    switch (params?.id) {
      case "terms": {
        const [gradesTerms, webSocTerms] = await Promise.all([
          prisma.gradesSection.findMany({
            distinct: ["year", "quarter"],
            select: {
              year: true,
              quarter: true,
            },
            orderBy: [{ year: "desc" }, { quarter: "desc" }],
          }),
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

        return res.createOKResult(webSocTerms, headers, requestId);
      }

      case "depts": {
        const [gradesDepts, webSocDepts] = await Promise.all([
          prisma.gradesSection.findMany({
            distinct: ["department"],
            select: {
              department: true,
            },
          }),
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

        return res.createOKResult(webSocDepts, headers, requestId);
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return res.createErrorResult(400, messages.join("; "), requestId);
    }
    return res.createErrorResult(400, error, requestId);
  }

  return res.createErrorResult(400, "Invalid endpoint", requestId);
}, onWarm);
