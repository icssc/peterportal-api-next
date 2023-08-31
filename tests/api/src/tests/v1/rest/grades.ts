import { assert, describe, expect, it } from "vitest";

describe("/v1/rest/grades tests", () => {
  it("fails when no operation is provided", async () => {
    const res = await get("/v1/rest/grades");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when invalid year is provided", async () => {
    const res = await get("/v1/rest/grades/raw?year=Foo&quarter=Fall");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("fails when invalid quarter is provided", async () => {
    const res = await get("/v1/rest/grades/raw?year=2023&quarter=Bar");
    expect(res).toHaveProperty("statusCode", 400);
    expect(res).toHaveProperty("error", "Bad Request");
    expect(res).toHaveProperty("message");
  });
  it("returns an array of sections and distributions for the raw endpoint", async () => {
    const res = await get("/v1/rest/grades/raw?year=2023&quarter=Spring&department=COMPSCI");
    assert("payload" in res);
    assert(Array.isArray(res.payload));
    expect(res.payload.length).toBeGreaterThan(0);
    res.payload.map((x) => {
      expect(x).toHaveProperty("year", "2023");
      expect(x).toHaveProperty("quarter", "Spring");
      assert("sectionCode" in x);
      expect(x.sectionCode).toMatch(/\d{5}/);
      expect(x).toHaveProperty("department", "COMPSCI");
      expect(x).toHaveProperty("courseNumber");
      expect(x).toHaveProperty("courseNumeric");
      assert("instructors" in x);
      assert(Array.isArray(x.instructors));
      expect(x.instructors.length).toBeGreaterThan(0);
      x.instructors.map((y: unknown) => {
        expect(typeof y).toBe("string");
      });
      expect(x).toHaveProperty("gradeACount");
      expect(x).toHaveProperty("gradeBCount");
      expect(x).toHaveProperty("gradeCCount");
      expect(x).toHaveProperty("gradeDCount");
      expect(x).toHaveProperty("gradeFCount");
      expect(x).toHaveProperty("gradePCount");
      expect(x).toHaveProperty("gradeNPCount");
      expect(x).toHaveProperty("gradeWCount");
      expect(x).toHaveProperty("averageGPA");
    });
  });
  it("returns sections taught by the correct instructor", async () => {
    const res = await get(
      "/v1/rest/grades/raw?year=2023&quarter=Spring&department=COMPSCI&instructor=SHINDLER,%20M.",
    );
    assert("payload" in res);
    assert(Array.isArray(res.payload));
    expect(res.payload.length).toBeGreaterThan(0);
    res.payload.map((x) => {
      assert("instructors" in x);
      assert(Array.isArray(x.instructors));
      expect(x.instructors.length).toBeGreaterThan(0);
      expect(x.instructors).toContain("SHINDLER, M.");
    });
  });
  it("returns sections in the correct division", async () => {
    const res = await get(
      "/v1/rest/grades/raw?year=2023&quarter=Spring&department=COMPSCI&division=UpperDiv",
    );
    assert("payload" in res);
    assert(Array.isArray(res.payload));
    expect(res.payload.length).toBeGreaterThan(0);
    res.payload.map((x) => {
      assert("courseNumeric" in x);
      expect(x.courseNumeric).toBeGreaterThan(99);
      expect(x.courseNumeric).toBeLessThan(200);
    });
  });
  it("returns an array of sections and one distribution object for the aggregate endpoint", async () => {
    const res = await get("/v1/rest/grades/aggregate?year=2023&quarter=Spring&department=COMPSCI");
    assert("payload" in res);
    assert(typeof res.payload === "object");
    assert(res.payload != null);
    assert("sectionList" in res.payload);
    assert(Array.isArray(res.payload.sectionList));
    res.payload.sectionList.map((x) => {
      expect(x).toHaveProperty("year", "2023");
      expect(x).toHaveProperty("quarter", "Spring");
      assert("sectionCode" in x);
      expect(x.sectionCode).toMatch(/\d{5}/);
      expect(x).toHaveProperty("department", "COMPSCI");
      expect(x).toHaveProperty("courseNumber");
      expect(x).toHaveProperty("courseNumeric");
      assert("instructors" in x);
      assert(Array.isArray(x.instructors));
      expect(x.instructors.length).toBeGreaterThan(0);
      x.instructors.map((y: unknown) => {
        assert(typeof y === "string");
      });
    });
    assert("gradeDistribution" in res.payload);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeACount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeBCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeCCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeDCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeFCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradePCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeNPCount");
    expect(res.payload.gradeDistribution).toHaveProperty("gradeWCount");
    expect(res.payload.gradeDistribution).toHaveProperty("averageGPA");
  });
  it("returns zeros for nonexistent aggregate", async () => {
    const res = await get("/v1/rest/grades/aggregate?year=2013");
    assert("payload" in res);
    expect(res.payload).toHaveProperty("sectionList", []);
    assert(typeof res.payload === "object");
    assert(res.payload !== null);
    assert("gradeDistribution" in res.payload);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeACount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeBCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeCCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeDCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeFCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradePCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeNPCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("gradeWCount", 0);
    expect(res.payload.gradeDistribution).toHaveProperty("averageGPA", 0);
  });
});
