import { callWebSocAPI, WebsocAPIOptions } from "@libs/websoc-api-next";
import { createErrorResult, createOKResult, LambdaHandler, logger } from "api-core";
import { combineResponses, fulfilled, sleep, sortResponse } from "api-route-websoc/lib";
import { Query } from "api-route-websoc/schema";
import { WebsocAPIResponse } from "peterportal-api-next-types";

export const handler: LambdaHandler = async (event, context) => {
  const requestId = context.awsRequestId;
  const { parsedQuery } = JSON.parse(event.body ?? "{}") as { parsedQuery: Query };
  let { queries } = JSON.parse(event.body ?? "{}") as { queries: WebsocAPIOptions[] };

  let retries = 0;

  let responses: PromiseSettledResult<WebsocAPIResponse>[] = [];
  let queryString = "";

  let successes: PromiseFulfilledResult<WebsocAPIResponse>[] = [];
  const failed: WebsocAPIOptions[] = [];

  let websocResponseData: WebsocAPIResponse = { schools: [] };

  while (queries.length && retries < 3) {
    responses = await Promise.allSettled(
      queries.map((options) => callWebSocAPI(parsedQuery, options))
    );

    responses.forEach((response, i) => {
      queryString = JSON.stringify(queries[i]);
      if (response.status === "fulfilled") {
        logger.info(`WebSoc query for ${queryString} succeeded`);
      } else {
        logger.info(`WebSoc query for ${queryString} failed`);
        failed.push(queries[i]);
      }
    });

    successes = responses.filter(fulfilled);
    websocResponseData = successes.reduce(
      (acc, curr) => combineResponses(acc, curr.value),
      websocResponseData
    );

    queries = failed;
    if (queries.length) await sleep(1000 * 2 ** retries++);
  }

  // 3 attempts + (1 + 2 + 4) seconds ~= Lambda timeout (15 seconds)
  if (retries >= 2)
    return createErrorResult(
      500,
      "WebSoc failed to respond too many times. Please try again later.",
      requestId
    );

  return createOKResult(sortResponse(websocResponseData), requestId);
};
