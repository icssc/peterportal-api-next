import { DDBDocClient } from "ddb";
import hash from "object-hash";
import type { Term } from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";

// The default TTL (5 minutes) in seconds for a new cache entry.
const CACHE_TTL = 5 * 60;

// The DynamoDB client used for updating the cache.
const docClient = new DDBDocClient();

export const handler = async (event: {
  tableName: string;
  term: Term;
  query: WebsocAPIOptions;
}) => {
  if (!event) throw new Error("Payload not provided");
  const { tableName, term, query } = event;
  if (!tableName || !term || !query) throw new Error("Malformed payload");
  await docClient.put(tableName, {
    requestHash: hash([term, query]),
    invalidateBy: Math.floor(Date.now() / 1000) + CACHE_TTL,
    data: await callWebSocAPI(term, query),
  });
};
