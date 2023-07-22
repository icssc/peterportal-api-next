import { PrismaClient } from "@libs/db";
import type { InternalHandler } from "ant-stack";
import { createErrorResult, createOKResult } from "ant-stack";
import type { WeekData } from "peterportal-api-next-types/types/week";
import { ZodError } from "zod";

import { getQuarter, getWeek } from "./lib";
import { QuerySchema } from "./schema";

let prisma: PrismaClient;

export const GET: InternalHandler = async (request) => {
  const { query, requestId } = request;

  prisma ??= new PrismaClient();

  if (request.isWarmerRequest) {
    try {
      await prisma.$connect();
      return createOKResult("Warmed", requestId);
    } catch (error) {
      createErrorResult(500, error, requestId);
    }
  }

  try {
    const parsedQuery = QuerySchema.parse(query);
    if (!parsedQuery.year) {
      const [month, day, year] = new Date()
        .toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
        .split(",")[0]
        .split("/")
        .map((x) => parseInt(x, 10));
      parsedQuery.year = year;
      parsedQuery.month = month;
      parsedQuery.day = day;
    }
    const { year, month, day } = parsedQuery;
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, day));
    const termsInProgress = await prisma.calendarTerm.findMany({
      where: { AND: [{ instructionStart: { lte: date } }, { instructionEnd: { gte: date } }] },
    });
    const termsInFinals = await prisma.calendarTerm.findMany({
      where: { AND: [{ finalsStart: { lte: date } }, { finalsEnd: { gte: date } }] },
    });
    // handle case of school break
    if (!termsInProgress.length && !termsInFinals.length)
      return createOKResult<WeekData>(
        {
          weeks: [-1],
          quarters: ["N/A"],
          display: "Enjoy your break! 😎",
        },
        requestId,
      );
    // handle case of one term in progress and no terms in finals (quarters during regular school year and SS2)
    if (termsInProgress.length === 1 && !termsInFinals.length) {
      const [term] = termsInProgress;
      const weeks = [getWeek(date, term)];
      const quarters = [getQuarter(term.year, term.quarter)];
      return createOKResult<WeekData>(
        {
          weeks,
          quarters,
          display: `Week ${weeks[0]} • ${quarters[0]}`,
        },
        requestId,
      );
    }
    // handle case of zero terms in progress and one term in finals (quarters during regular school year and SS2)
    if (!termsInProgress.length && termsInFinals.length === 1) {
      const [term] = termsInFinals;
      const quarters = [getQuarter(term.year, term.quarter)];
      return createOKResult<WeekData>(
        {
          weeks: [-1],
          quarters,
          display: `Finals${term.quarter === "Summer2" ? "" : " Week"} • ${
            quarters[0]
          }. Good luck! 🤞`,
        },
        requestId,
      );
    }
    // handle case of two terms in progress (SS1+SS10wk or SS10wk+SS2) and no terms in finals
    if (termsInProgress.length === 2 && !termsInFinals.length) {
      const [week1, week2] = termsInProgress.map((x) => getWeek(date, x));
      const [quarter1, quarter2] = termsInProgress.map(({ year, quarter }) =>
        getQuarter(year, quarter),
      );
      let display: string;
      if (week1 === week2) {
        display = `Week ${week1} • ${quarter1} | ${quarter2}`;
      } else {
        display = `Week ${week1} • ${quarter1} | Week ${week2} • ${quarter2}`;
      }
      return createOKResult<WeekData>(
        {
          weeks: [week1, week2],
          quarters: [quarter1, quarter2],
          display,
        },
        requestId,
      );
    }
    // handle case of one term in progress and one term in finals (SS1+SS10wk or SS10wk+SS2)
    if (termsInProgress.length === 1 && termsInFinals.length === 1) {
      const [termInProgress] = termsInProgress;
      const [termInFinals] = termsInFinals;
      const weeks = [getWeek(date, termInProgress), -1];
      const quarters = [termInProgress, termInFinals].map(({ year, quarter }) =>
        getQuarter(year, quarter),
      );
      return createOKResult<WeekData>(
        {
          weeks,
          quarters,
          display: `Finals • ${quarters[1]}. Good luck! 🤞 | Week ${weeks[0]} • ${quarters[0]}`,
        },
        requestId,
      );
    }
    // cases above should be exhaustive but you never know
    return createErrorResult(
      500,
      "Something unexpected happened. Please try again later.",
      requestId,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }
    return createErrorResult(400, error, requestId);
  }
};
