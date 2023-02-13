import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import { Quarter, Term } from "peterportal-api-next-types";
import { getTermDateData } from "registrar-api";
import { getTerms } from "websoc-api-next";

const shortNameToTerm = (shortName: string): Term => {
  const [year, q] = shortName.split(" ");
  return {
    year,
    quarter: q as Quarter,
  };
};

export const handler = async () => {
  /* Determine which term(s) we're scraping. */

  const now = new Date();
  let currentYear = now.getFullYear().toString();
  let currentTerms = await getTermDateData(currentYear);
  if (now <= currentTerms[`${currentYear} Fall`].instructionStart) {
    currentYear = (parseInt(currentYear) - 1).toString();
    currentTerms = await getTermDateData(currentYear);
  }
  const termsToScrape = (await getTerms())
    .map((x) => x.shortName)
    .filter((x) => x in currentTerms && now <= currentTerms[x].finalsEnd);
  const lambdaClient = new LambdaClient({
    /* eslint-disable turbo/no-undeclared-env-vars */
    region: process.env.AWS_REGION,
    /* eslint-enable */
  });
  await Promise.all(
    termsToScrape.map((t) =>
      lambdaClient.send(
        new InvokeCommand({
          FunctionName: "peterportal-api-next-websoc-scraper-parent",
          InvocationType: InvocationType.Event,
          Payload: JSON.stringify({
            term: shortNameToTerm(t),
          }) as unknown as Uint8Array,
        })
      )
    )
  );
};
