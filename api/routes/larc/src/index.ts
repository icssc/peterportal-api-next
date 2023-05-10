import * as cheerio from "cheerio";

export async function getLarcSections() {
  const html = await fetch("https://enroll.larc.uci.edu/").then((res) => res.text());

  const $ = cheerio.load(html);

  const larcSections = $(".tutorial-group").map((_, card) => {
    const match = $(card)
      .find(".card-header")
      .text()
      .trim()
      .match(/(?<courseCode>[^()]*)( \(same as (?<sameAs>.*)\))? - (.*) \((?<courseName>.*)\)/);

    const body = $(card)
      .find(".list-group")
      .map((_, group) => {
        const rows = $(group).find(".col-lg-4");

        const [day, time] = $(rows[0])
          .find(".col")
          .map((_, col) => $(col).text().trim());

        const [instructor, building] = $(rows[1])
          .find(".col")
          .map((_, col) => $(col).text().trim());

        return { day, time, instructor, building };
      })
      .toArray();

    const larcSection = { header: match?.groups, body };

    console.log("header: ", larcSection.header, "\n", "body: ", larcSection.body);

    return larcSection;
  });

  return larcSections;
}

getLarcSections();
