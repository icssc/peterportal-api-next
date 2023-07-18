import { createOKResult, type InternalHandler } from "ant-stack";
import cheerio from "cheerio";
import { fetch } from "cross-fetch";

export const GET: InternalHandler = async (request) => {
  const html = await fetch("https://enroll.larc.uci.edu/").then((res) => res.text());

  const $ = cheerio.load(html);

  const larcSections = $(".tutorial-group")
    .toArray()
    .map((card) => {
      const match = $(card)
        .find(".card-header")
        .text()
        .trim()
        .match(/(?<courseCode>[^()]*)( \(same as (?<sameAs>.*)\))? - (.*) \((?<courseName>.*)\)/);

      const body = $(card)
        .find(".list-group")
        .toArray()
        .map((group) => {
          const rows = $(group).find(".col-lg-4");

          const [day, time] = $(rows[0])
            .find(".col")
            .map((_, col) => $(col).text().trim());

          const [instructor, building] = $(rows[1])
            .find(".col")
            .map((_, col) => $(col).text().trim());

          return { day, time, instructor, building };
        });

      return { header: { ...match?.groups }, body };
    });

  return createOKResult(larcSections, request.requestId);
};

export const HEAD = GET;
