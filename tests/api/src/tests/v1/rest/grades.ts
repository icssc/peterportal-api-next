import { assert, describe, expect, it } from "vitest";

describe("/v1/rest/grades tests", () => {
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
