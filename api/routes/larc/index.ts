import { createOKResult, RawHandler } from "api/core";
import { load } from "cheerio";
import { WebsocSectionMeeting } from "peterportal-api-next-types";
import puppeteer from "puppeteer";

export interface LarcMeeting extends WebsocSectionMeeting {
  instructors: string[];
}

// Grab data from LARC site.
const getData = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://enroll.larc.uci.edu/");
  const data = await page.content();
  await browser.close();

  const ret: any[] = [];

  const $ = load(data);

  $("div.wrapper")
    .find("div#main-content")
    .find("div.card.tutorial-group")
    .each(() => {
      const obj = {
        courseCode: "",
        instructors: [] as string[],
        sections: [] as LarcMeeting[],
      };

      const header = $("div.card-header", this).text().trim();

      const [courseCode, courseInfo] = header
        .split(" - ")[0]
        .replaceAll(/\(.*\)/g, "")
        .trim();

      obj.courseCode = courseCode;

      const [instructors, _courseName] = courseInfo.split(" / ");

      obj.instructors = instructors.split(" or ");

      $("div.row.card-body", this)
        .find("div.col.m-2")
        .each((i) => {
          const text = $(this).text().trim();
          const j = Math.floor(i / 6);
          switch (i % 6) {
            case 0:
              obj.sections.push({
                days: "",
                time: "",
                instructors: [],
                bldg: [],
              });

              obj.sections[j].days = text
                .split("/")
                .map((x) => (x[0] === "T" ? x.slice(0, 2) : x[0]))
                .join("");
              break;

            case 1:
              obj.sections[j].time = text;
              break;

            case 2:
              obj.sections[j].instructors = [text];
              break;

            case 3:
              obj.sections[j].bldg = [text];
              break;
          }
        });

      ret.push(obj);
    });

  return ret;
};

const handler: RawHandler = async (event) => {
  const { requestId } = event.getParams();
  const ret = await getData();
  return createOKResult(ret, requestId);
};

export default handler;

async function start() {
  const data = await getData();
  console.log({ data });
}

start();
