import { PrismaClient } from "@libs/db";
import { createErrorResult, createOKResult } from "@libs/lambda";
import type { EnrollmentHistory } from "@peterportal-api/types";
import type { APIGatewayProxyHandler } from "aws-lambda";

import { QuerySchema } from "./schema";

const prisma = new PrismaClient();

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const { headers, queryStringParameters: query } = event;
  const { awsRequestId: requestId } = context;

  const maybeParsed = QuerySchema.safeParse(query);
  if (!maybeParsed.success) {
    return createErrorResult(400, maybeParsed.error, requestId);
  }
  const { data: where } = maybeParsed;

  const data = await prisma.websocEnrollmentHistory.findMany({ where });
  const ret: Record<string, EnrollmentHistory> = {};
  for (const entry of data.sort((a, b) => (a.date === b.date ? 0 : a > b ? 1 : -1))) {
    const key = `${entry.year}-${entry.quarter}-${entry.sectionCode}`;
    if (key in ret) {
      const {
        date,
        maxCapacity,
        totalEnrolled,
        waitlist,
        waitlistCap,
        requested,
        newOnlyReserved,
        status,
      } = entry;
      ret[key].dates.push(date);
      ret[key].maxCapacityHistory.push(maxCapacity);
      ret[key].totalEnrolledHistory.push(totalEnrolled);
      ret[key].waitlistHistory.push(waitlist);
      ret[key].waitlistCapHistory.push(waitlistCap);
      ret[key].requestedHistory.push(requested);
      ret[key].newOnlyReservedHistory.push(newOnlyReserved);
      ret[key].statusHistory.push(status);
    } else {
      const {
        date,
        maxCapacity,
        totalEnrolled,
        waitlist,
        waitlistCap,
        requested,
        newOnlyReserved,
        status,
        ...meta
      } = entry;
      ret[key] = {
        ...meta,
        sectionCode: meta.sectionCode.toString(),
        instructors: meta.instructors as string[],
        meetings: meta.meetings as string[],
        dates: [date],
        maxCapacityHistory: [maxCapacity],
        totalEnrolledHistory: [totalEnrolled],
        waitlistHistory: [waitlist],
        waitlistCapHistory: [waitlistCap],
        requestedHistory: [requested],
        newOnlyReservedHistory: [newOnlyReserved],
        statusHistory: [status],
      };
    }
  }
  return createOKResult(Object.values(ret), headers, requestId);
};
