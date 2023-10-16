import { createErrorResult, createOKResult } from "@libs/lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { load } from "cheerio";
import { fetch } from "cross-fetch";
import { ZodError } from "zod";

import { fmtBldg, fmtDays, fmtTime, quarterToLarcSuffix } from "./lib";
import { QuerySchema } from "./schema";

export const GET: APIGatewayProxyHandler = async (event, context) => {
  const headers = event.headers;
  const requestId = context.awsRequestId;
  const query = event.queryStringParameters;

  try {
    const { year, quarter } = QuerySchema.parse(query);

    // SS10wk does not have LARC sessions apparently
    if (quarter === "Summer10wk") return createOKResult([], headers, requestId);

    // TODO: move this code to its own scraper, and rewrite this route to fetch
    // data from the DB.

    const html = await fetch(
      `https://enroll.larc.uci.edu/${year}${quarterToLarcSuffix(quarter)}`,
    ).then((res) => res.text());

    const $ = load(html);

    const larcSections = $(".tutorial-group")
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

    return createOKResult(larcSections, headers, requestId);
  } catch (e) {
    if (e instanceof ZodError) {
      const messages = e.issues.map((issue) => issue.message);
      return createErrorResult(400, messages.join("; "), requestId);
    }

    return createErrorResult(400, e, requestId);
  }
};
