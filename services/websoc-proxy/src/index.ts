import { callWebSocAPI, getDepts, getTerms, WebsocAPIOptions } from "@libs/websoc-api-next";
import { createErrorResult, createOKResult, logger } from "ant-stack";
import { combineResponses, fulfilled, sleep, sortResponse } from "api-v1-rest-websoc/src/lib";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { WebsocAPIResponse } from "peterportal-api-next-types";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const body = JSON.parse(event.body ?? "{}");
  switch (body.function) {
    case "depts":
      return createOKResult(await getDepts(), {}, requestId);
    case "terms":
      return createOKResult(await getTerms(), {}, requestId);
    case "websoc": {
      const parsedQuery = body.parsedQuery;
      let queries: WebsocAPIOptions[] = body.queries;
      let retries = 0;

      let responses: PromiseSettledResult<WebsocAPIResponse>[] = [];
      let queryString = "";

      let successes: PromiseFulfilledResult<WebsocAPIResponse>[] = [];
      const failed: WebsocAPIOptions[] = [];

      let websocResponseData: WebsocAPIResponse = { schools: [] };

      while (queries.length && retries < 3) {
        responses = await Promise.allSettled(
          queries.map((options) => callWebSocAPI(parsedQuery, options)),
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
          websocResponseData,
        );

        queries = failed;
        if (queries.length) await sleep(1000 * 2 ** retries++);
      }

      // 3 attempts + (1 + 2 + 4) seconds ~= Lambda timeout (15 seconds)
      if (retries >= 2)
        return createErrorResult(
          500,
          "WebSoc failed to respond too many times. Please try again later.",
          requestId,
        );

      // Do not compress responses.
      return createOKResult(sortResponse(websocResponseData), { "accept-encoding": "" }, requestId);
    }
    default:
      return createOKResult({}, {}, requestId);
  }
};