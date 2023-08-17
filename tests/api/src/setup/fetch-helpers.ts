import fetch from "cross-fetch";
import type { RawResponse } from "peterportal-api-next-types";
import { beforeAll } from "vitest";

declare global {
  // eslint-disable-next-line no-var
  var get: (endpoint: string) => Promise<RawResponse<unknown>>;
}

const baseUrl = `http://localhost:${process.env.API_PORT ?? 8080}`;

beforeAll(() => {
  globalThis.get = async (endpoint: string) => {
    const res = await fetch(`${baseUrl}${endpoint}`);
    return await res.json();
  };
});
