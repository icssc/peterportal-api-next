import { load } from "cheerio";
import fetch from "cross-fetch";
import { QuarterDates, quarters } from "peterportal-api-next-types";

/* region types */

type PropertiesToDate<T> = {
  [K in keyof T]: ToDate<T[K]>;
};

type ToDate<T> = T extends string ? Date : T extends object ? PropertiesToDate<T> : string;

type IndexablePartialQuarterDates = Partial<ToDate<QuarterDates> & { [p: string]: Date }>;

/* endregion */

/* region Constants */

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* endregion */

/* region Helper functions */

const addSingleDateRow = (
  data: string[][],
  index: number,
  key: string,
  record: Record<string, IndexablePartialQuarterDates>,
  year: string,
  offset = 0,
): void => {
  for (const [idx, date] of data[index].entries()) {
    const currYear = idx == offset ? parseInt(year) : parseInt(year) + 1;
    const [month, day] = date.split(" ");
    record[`${currYear} ${quarters[idx + offset]}`][key] = new Date(
      currYear,
      months.indexOf(month),
      parseInt(day),
    );
  }
};

const addMultipleDateRow = (
  data: string[][],
  index: number,
  keyStart: string,
  keyEnd: string,
  record: Record<string, IndexablePartialQuarterDates>,
  year: string,
  offset = 0,
): void => {
  for (const [idx, date] of data[index].entries()) {
    const currYear = idx == offset ? parseInt(year) : parseInt(year) + 1;
    const start = date.split("–")[0];
    let end = date.split("–")[1];
    if (end === undefined) end = start;
    const [startMonth, startDay] = start.split(" ");
    let [endMonth, endDay] = end.split(" ");
    if (endDay === undefined) {
      endDay = endMonth;
      endMonth = startMonth;
    }
    record[`${currYear} ${quarters[idx + offset]}`][keyStart] = new Date(
      currYear,
      months.indexOf(startMonth),
      parseInt(startDay),
    );
    record[`${currYear} ${quarters[idx + offset]}`][keyEnd] = new Date(
      currYear,
      months.indexOf(endMonth),
      parseInt(endDay),
    );
  }
};

/* endregion */

/* region Exported functions */

// Returns relevant date data for each term in the given academic year.
export const getTermDateData = async (
  year: string,
): Promise<Record<string, ToDate<QuarterDates>>> => {
  if (year.length !== 4 || isNaN(parseInt(year))) throw new Error("Error: Invalid year provided.");
  const shortYear = year.slice(2);
  const response = await fetch(
    `https://www.reg.uci.edu/calendars/quarterly/${year}-${
      parseInt(year, 10) + 1
    }/quarterly${shortYear}-${parseInt(shortYear, 10) + 1}.html`,
  );
  if (response.status === 404) return {};
  const quarterData: string[][] = [];
  const summerSessionData: string[][] = [];
  const $ = load(await response.text());
  const $table = $("table.calendartable");
  $table
    .eq(2)
    .find("tr")
    .each(function () {
      quarterData.push(
        $(this)
          .text()
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => x.length)
          .slice(1),
      );
    });
  $table
    .eq(4)
    .find("tr")
    .each(function () {
      summerSessionData.push(
        $(this)
          .text()
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => x.length)
          .slice(1),
      );
    });
  const ret = quarters
    .map((x, i) => `${i == 0 ? year : parseInt(year) + 1} ${x}`)
    .reduce(
      (p, c) => {
        p[c] = {};
        return p;
      },
      {} as Record<string, Partial<ToDate<QuarterDates>>>,
    );
  addSingleDateRow(quarterData, 2, "instructionStart", ret, year);
  addSingleDateRow(quarterData, 17, "instructionEnd", ret, year);
  addMultipleDateRow(quarterData, 18, "finalsStart", "finalsEnd", ret, year);
  addSingleDateRow(
    summerSessionData,
    // Before the 2021-22 academic year, Juneteenth was either not observed or observed during one of the Summer Sessions.
    // This change accounts for the difference in table row numbering caused by this change.
    2 + Number(parseInt(year, 10) > 2020),
    "instructionStart",
    ret,
    year,
    3,
  );
  addSingleDateRow(summerSessionData, 6, "instructionEnd", ret, year, 3);
  addMultipleDateRow(summerSessionData, 7, "finalsStart", "finalsEnd", ret, year, 3);
  console.log(ret);
  // Normalize all terms to start on a Monday, or a Thursday if it is Fall.
  for (const key in ret) {
    if (key.includes("Fall")) {
      (ret[key] as ToDate<QuarterDates>).instructionStart.setDate(
        (ret[key] as ToDate<QuarterDates>).instructionStart.getDate() -
          ((ret[key] as ToDate<QuarterDates>).instructionStart.getDay() - 4),
      );
    } else {
      (ret[key] as ToDate<QuarterDates>).instructionStart.setDate(
        (ret[key] as ToDate<QuarterDates>).instructionStart.getDate() -
          ((ret[key] as ToDate<QuarterDates>).instructionStart.getDay() - 1),
      );
    }
  }
  return ret as Record<string, ToDate<QuarterDates>>;
};

/* endregion */
