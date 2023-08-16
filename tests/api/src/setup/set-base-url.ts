import { afterAll, beforeAll } from "vitest";

declare global {
  // eslint-disable-next-line no-var
  var baseUrl: string | undefined;
}

beforeAll(() => {
  globalThis.baseUrl = `http://localhost:${process.env.API_PORT ?? 8080}`;
});

afterAll(() => {
  delete globalThis.baseUrl;
});
