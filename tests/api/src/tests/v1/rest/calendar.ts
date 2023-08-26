import { assert, describe, expect, it } from "vitest";

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
    assert("payload" in res);
    assert(typeof res.payload === "object");
    assert(res.payload !== null);
    assert("instructionStart" in res.payload);
    assert("instructionEnd" in res.payload);
    assert("finalsStart" in res.payload);
    assert("finalsEnd" in res.payload);
    expect(res.payload.instructionStart).toSatisfy(isValidDate);
    expect(res.payload.instructionEnd).toSatisfy(isValidDate);
    expect(res.payload.finalsStart).toSatisfy(isValidDate);
    expect(res.payload.finalsEnd).toSatisfy(isValidDate);
  });
  it("returns dates that are nondecreasing", async () => {
    const res = await get("/v1/rest/calendar?year=2023&quarter=Spring");
    expect(res).toHaveProperty("statusCode", 200);
    assert("payload" in res);
    assert(typeof res.payload === "object");
    assert(res.payload !== null);
    assert("instructionStart" in res.payload);
    assert("instructionEnd" in res.payload);
    assert("finalsStart" in res.payload);
    assert("finalsEnd" in res.payload);
    assert(typeof res.payload.instructionStart === "string");
    assert(typeof res.payload.instructionEnd === "string");
    assert(typeof res.payload.finalsStart === "string");
    assert(typeof res.payload.finalsEnd === "string");
    expect(Date.parse(res.payload.finalsEnd)).toBeGreaterThanOrEqual(
      Date.parse(res.payload.finalsStart),
    );
    expect(Date.parse(res.payload.finalsStart)).toBeGreaterThanOrEqual(
      Date.parse(res.payload.instructionEnd),
    );
    expect(Date.parse(res.payload.instructionEnd)).toBeGreaterThanOrEqual(
      Date.parse(res.payload.instructionStart),
    );
  });
});
