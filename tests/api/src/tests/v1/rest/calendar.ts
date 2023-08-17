import type { QuarterDates, Response } from "peterportal-api-next-types";
import { describe, expect, it } from "vitest";

describe("/v1/rest/calendar tests", () => {
  const isValidDate = (s: string) => !Number.isNaN(Date.parse(s));
  it("fails when year and quarter are not provided", async () => {
    const res = await get("/v1/rest/calendar");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when quarter is not provided", async () => {
    const res = await get("/v1/rest/calendar?year=2023");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when year is not provided", async () => {
    const res = await get("/v1/rest/calendar?quarter=Fall");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when invalid year is provided", async () => {
    const res = await get("/v1/rest/calendar?year=Foo&quarter=Fall");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when invalid quarter is provided", async () => {
    const res = await get("/v1/rest/calendar?year=2023&quarter=Bar");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when year provided is too early", async () => {
    const res = await get("/v1/rest/calendar?year=2009&quarter=Spring");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("returns payload with date strings in fields", async () => {
    const res = await get("/v1/rest/calendar?year=2023&quarter=Fall");
    expect(res).toHaveProperty("statusCode", 200);
    const payload = (res as Response<QuarterDates>).payload;
    expect(payload.instructionStart).toSatisfy(isValidDate);
    expect(payload.instructionEnd).toSatisfy(isValidDate);
    expect(payload.finalsStart).toSatisfy(isValidDate);
    expect(payload.finalsEnd).toSatisfy(isValidDate);
  });
  it("returns dates that are nondecreasing", async () => {
    const res = await get("/v1/rest/calendar?year=2023&quarter=Spring");
    expect(res).toHaveProperty("statusCode", 200);
    const payload = (res as Response<QuarterDates>).payload;
    expect(Date.parse(payload.finalsEnd as unknown as string)).toBeGreaterThanOrEqual(
      Date.parse(payload.finalsStart as unknown as string),
    );
    expect(Date.parse(payload.finalsStart as unknown as string)).toBeGreaterThanOrEqual(
      Date.parse(payload.instructionEnd as unknown as string),
    );
    expect(Date.parse(payload.instructionEnd as unknown as string)).toBeGreaterThanOrEqual(
      Date.parse(payload.instructionStart as unknown as string),
    );
  });
});
