import { load } from "cheerio";
import fetch from "cross-fetch";
import { QuarterDates, quarters } from "peterportal-api-next-types";

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

/* region Helper functions */

const addSingleDateRow = (
  data: string[][],
  index: number,
  key: string,
  record: Record<string, Partial<QuarterDates & { [p: string]: Date }>>,
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
  record: Record<string, Partial<QuarterDates & { [p: string]: Date }>>,
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

// Returns relevant date data for each term in the given academic year.
export const getTermDateData = async (
  year: string
): Promise<Record<string, QuarterDates>> => {
  if (year.length !== 4 || isNaN(parseInt(year)))
    throw new Error("Error: Invalid year provided.");
  const shortYear = year.slice(2);
  const response = await fetch(
    `https://www.reg.uci.edu/calendars/quarterly/${year}-${
      parseInt(year) + 1
    }/quarterly${shortYear}-${parseInt(shortYear) + 1}.html`
  );
  if (response.status === 404) return {};
  const enrollmentData: string[][] = [];
  const quarterData: string[][] = [];
  const summerSessionData: string[][] = [];
  const $ = load(await response.text());
  const $table = $("table.calendartable");
  $table
    .eq(0)
    .find("tr")
    .each(function () {
      enrollmentData.push(
        $(this)
          .text()
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => x.length)
          .slice(1)
      );
    });
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
  enrollmentData[3] = enrollmentData[3].filter((_, i) => !(i % 5) && i);
  const ret = quarters
    .map((x, i) => `${i == 0 ? year : parseInt(year) + 1} ${x}`)
    .reduce((p, c) => {
      p[c] = {};
      return p;
    }, {} as Record<string, Partial<QuarterDates>>);
  addSingleDateRow(enrollmentData, 1, "scheduleAvailable", ret, year);
  addMultipleDateRow(enrollmentData, 3, "enrollmentStart", "_", ret, year, 0);
  addSingleDateRow(quarterData, 2, "instructionStart", ret, year);
  addSingleDateRow(quarterData, 6, "unrestrictedEnrollmentEnd", ret, year);
  addSingleDateRow(quarterData, 16, "enrollmentEnd", ret, year);
  addSingleDateRow(quarterData, 17, "instructionEnd", ret, year);
  addMultipleDateRow(quarterData, 18, "finalsStart", "finalsEnd", ret, year);
  addSingleDateRow(
    summerSessionData,
    parseInt(year) <= 2020 ? 2 : 3,
    "instructionStart",
    ret,
    year,
    3
  );
  addSingleDateRow(
    summerSessionData,
    parseInt(year) <= 2019 ? 5 : 6,
    "instructionEnd",
    ret,
    year,
    3
  );
  addMultipleDateRow(
    summerSessionData,
    parseInt(year) <= 2019 ? 6 : 7,
    "finalsStart",
    "finalsEnd",
    ret,
    year,
    3
  );
  for (const key in ret) {
    if (key.includes("Winter")) {
      ret[key].scheduleAvailable?.setFullYear(
        (ret[key].scheduleAvailable?.getFullYear() ?? 0) - 1
      );
      ret[key].enrollmentStart?.setFullYear(
        (ret[key].enrollmentStart?.getFullYear() ?? 0) - 1
      );
    }
    if (key.includes("Summer")) {
      ret[key].scheduleAvailable = new Date(parseInt(year) + 1, 2, 1);
      ret[key].enrollmentStart = new Date(parseInt(year) + 1, 2, 1);
      if (ret[key].instructionStart?.getDay() !== 1) {
        ret[key].instructionStart?.setDate(
          (ret[key].instructionStart?.getDate() ?? 0) -
            ((ret[key].instructionStart?.getDay() ?? 0) - 1)
        );
      }
      if (!key.includes("Summer10wk")) {
        ret[key].unrestrictedEnrollmentEnd = new Date(
          ret[key].instructionStart?.getTime() ?? 0
        );
        ret[key].unrestrictedEnrollmentEnd?.setDate(
          (ret[key].unrestrictedEnrollmentEnd?.getDate() ?? 0) + 4
        );
        ret[key].enrollmentEnd = new Date(
          ret[key].unrestrictedEnrollmentEnd?.getTime() ?? 0
        );
        ret[key].enrollmentEnd?.setDate(
          (ret[key].enrollmentEnd?.getDate() ?? 0) + 2 * 7
        );
      } else {
        ret[key].unrestrictedEnrollmentEnd = new Date(
          ret[key].instructionStart?.getTime() ?? 0
        );
        ret[key].unrestrictedEnrollmentEnd?.setDate(
          (ret[key].unrestrictedEnrollmentEnd?.getDate() ?? 0) + 7 + 4
        );
        ret[key].enrollmentEnd = new Date(
          ret[key].unrestrictedEnrollmentEnd?.getTime() ?? 0
        );
        ret[key].enrollmentEnd?.setDate(
          (ret[key].enrollmentEnd?.getDate() ?? 0) + 4 * 7
        );
      }
    }
    delete (ret[key] as QuarterDates & { _: never })._;
    ret[key] = Object.fromEntries(
      Object.entries(ret[key]).sort((a, b) =>
        a[1] === b[1] ? 0 : a[1] < b[1] ? -1 : 1
      )
    );
  }
  return ret as Record<string, QuarterDates>;
};
/* endregion */
