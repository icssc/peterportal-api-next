import { PrismaClient } from "@libs/db";
import { LarcResponse, Quarter } from "@peterportal-api/types";
import { load } from "cheerio";
import { fetch } from "cross-fetch";

import { fmtBldg, fmtDays, fmtTime, quarterToLarcSuffix } from "./lib";

const EARLIEST_YEAR = 2019;

const prisma = new PrismaClient();

export const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export const handler = async () => {
  const data: Array<{ year: string; quarter: Quarter; courses: LarcResponse }> = [];
  const quarters = ["Fall", "Winter", "Spring", "Summer1", "Summer2"] as const;
  for (let year = EARLIEST_YEAR; year < new Date().getFullYear() + 2; ++year) {
    for (const quarter of quarters) {
      console.log(`Scraping ${year} ${quarter}`);
      const html = await fetch(
        `https://enroll.larc.uci.edu/${year}${quarterToLarcSuffix(quarter)}`,
      ).then((response) => response.text());

      const $ = load(html);

      const courses = $(".tutorial-group")
        .toArray()
        .map((card) => {
          const match = $(card)
            .find(".card-header")
            .text()
            .trim()
            .match(
              /(?<courseNumber>[^()]*)( \(same as (?<sameAs>.*)\))? - (.*) \((?<courseName>.*)\)/,
            );

          const sections = $(card)
            .find(".list-group")
            .toArray()
            .map((group) => {
              const rows = $(group).find(".col-lg-4");

              const [days, time] = $(rows[0])
                .find(".col")
                .map((_, col) => $(col).text().trim());

              const [instructor, building] = $(rows[1])
                .find(".col")
                .map((_, col) => $(col).text().trim());

              return {
                days: fmtDays(days),
                time: fmtTime(time),
                instructor,
                bldg: fmtBldg(building),
              };
            });

          return { courseInfo: { ...match?.groups }, sections };
        });
      data.push({ year: year.toString(), quarter, courses: (courses as LarcResponse) ?? [] });
      await sleep(1000);
    }
  }
  await prisma.$transaction([prisma.larcTerm.deleteMany({}), prisma.larcTerm.createMany({ data })]);
};

handler().then();
