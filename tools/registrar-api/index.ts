import { load } from "cheerio";
import fetch from "cross-fetch";
import { quarters } from "peterportal-api-next-types";

/* region Constants */

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* region Type declarations */

export interface TermData {
  instructionStart: Date;
  instructionEnd: Date;
  finalsStart: Date;
  finalsEnd: Date;
}

/* endregion */

/* region Helper functions */

const addSingleDateRow = (
  data: string[][],
  index: number,
  key: string,
  record: Record<string, Partial<TermData & { [p: string]: Date }>>,
  year: string,
  offset = 0
): void => {
  for (const [idx, date] of data[index].entries()) {
    const currYear = idx == offset ? parseInt(year) : parseInt(year) + 1;
    const [month, day] = date.split(" ");
    record[`${currYear} ${quarters[idx + offset]}`][key] = new Date(
      currYear,
      months.indexOf(month),
      parseInt(day)
    );
  }
};

const addMultipleDateRow = (
  data: string[][],
  index: number,
  keyStart: string,
  keyEnd: string,
  record: Record<string, Partial<TermData & { [p: string]: Date }>>,
  year: string,
  offset = 0
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
      parseInt(startDay)
    );
    record[`${currYear} ${quarters[idx + offset]}`][keyEnd] = new Date(
      currYear,
      months.indexOf(endMonth),
      parseInt(endDay)
    );
  }
};

/* endregion */

/* region Exported functions */

// Returns relevant data for each term in the given academic year.
export const getTermData = async (
  year: string
): Promise<Record<string, TermData>> => {
  if (year.length !== 4 || isNaN(parseInt(year)))
    throw new Error("Error: Invalid year provided.");
  const shortYear = year.slice(2);
  const response = await (
    await fetch(
      `https://www.reg.uci.edu/calendars/quarterly/${year}-${
        parseInt(year) + 1
      }/quarterly${shortYear}-${parseInt(shortYear) + 1}.html`
    )
  ).text();
  const quarterData: string[][] = [];
  const summerSessionData: string[][] = [];
  const $ = load(response);
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
          .slice(1)
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
          .slice(1)
      );
    });
  const ret = quarters
    .map((x, i) => `${i == 0 ? year : parseInt(year) + 1} ${x}`)
    .reduce((p, c) => {
      p[c] = {};
      return p;
    }, {} as Record<string, Partial<TermData>>);
  addSingleDateRow(quarterData, 2, "instructionStart", ret, year);
  addSingleDateRow(quarterData, 17, "instructionEnd", ret, year);
  addMultipleDateRow(quarterData, 18, "finalsStart", "finalsEnd", ret, year);
  addSingleDateRow(summerSessionData, 3, "instructionStart", ret, year, 3);
  addSingleDateRow(summerSessionData, 6, "instructionEnd", ret, year, 3);
  addMultipleDateRow(
    summerSessionData,
    7,
    "finalsStart",
    "finalsEnd",
    ret,
    year,
    3
  );
  return ret as Record<string, TermData>;
};

/* endregion */
