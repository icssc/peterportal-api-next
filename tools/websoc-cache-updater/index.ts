import { DDBDocClient } from "ddb";
import hash from "object-hash";
import type { Term } from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";

const CACHE_TTL = 5 * 60;

export const handler = async (event: {
  tableName: string;
  term: Term;
  query: WebsocAPIOptions;
}) => {
  if (!event) throw new Error("Payload not provided");
  const { tableName, term, query } = event;
  if (!tableName || !term || !query) throw new Error("Malformed payload");
  const docClient = new DDBDocClient();
  await docClient.put(tableName, {
    requestHash: hash([term, query]),
    invalidateBy: Date.now() + CACHE_TTL,
    data: await callWebSocAPI(term, query),
  });
};
