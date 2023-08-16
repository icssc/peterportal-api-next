import { describe, expect, test } from "vitest";

import { callWebSocAPI, getDepts, getTerms } from "../src";

describe("websoc-api-next tests", () => {
  test("getDepts return includes COMPSCI", async () => {
    expect(await getDepts()).toContainEqual({
      deptLabel: "COMPSCI: Computer Science",
      deptValue: "COMPSCI",
    });
  });

  test("getTerms return includes 2023 Winter", async () => {
    expect(await getTerms()).toContainEqual({
      shortName: "2023 Winter",
      longName: "2023 Winter Quarter",
    });
  });

  test("WebSOC query for Lower Division I&C SCI courses in 2021 Fall contains I&C SCI 32A", async () => {
    const res = await callWebSocAPI(
      { year: "2021", quarter: "Fall" },
      {
        department: "I&C SCI",
        division: "LowerDiv",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("I&C SCI");
    expect(
      res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "32A").length,
    ).toBe(1);
  });

  test("WebSOC query for Upper Division COMPSCI courses in 2022 Winter includes COMPSCI 161", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Winter" },
      {
        department: "COMPSCI",
        division: "UpperDiv",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "161").length,
    ).toBe(1);
  });

  test("WebSOC query for Graduate/Professional COMPSCI courses in 2022 Spring includes COMPSCI 260P", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Spring" },
      {
        department: "COMPSCI",
        division: "Graduate",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "260P").length,
    ).toBe(1);
  });

  test("WebSOC query for COMPSCI courses in 2022 Summer1 includes COMPSCI 143A", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Summer1" },
      {
        department: "COMPSCI",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "143A").length,
    ).toBe(1);
  });

  test("WebSOC query for I&C SCI courses in 2022 Summer10wk includes I&C SCI 31", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Summer10wk" },
      {
        department: "I&C SCI",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("I&C SCI");
    expect(res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "31").length).toBe(
      1,
    );
  });

  test("WebSOC query for I&C SCI courses in 2022 Summer2 includes I&C SCI 6B", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Summer2" },
      {
        department: "I&C SCI",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("I&C SCI");
    expect(res.schools[0].departments[0].courses.filter((x) => x.courseNumber == "6B").length).toBe(
      1,
    );
  });

  test("WebSOC query for I&C SCI 6B in 2022 Summer2 has blank waitlist count in all sections", async () => {
    const res = await callWebSocAPI(
      { year: "2022", quarter: "Summer2" },
      {
        department: "I&C SCI",
        courseNumber: "6B",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("I&C SCI");
    expect(
      res.schools[0].departments[0].courses[0].sections.every((x) => x.numOnWaitlist == ""),
    ).toBeTruthy();
  });

  test("WebSOC query for ECON courses in 2023 Winter includes comments for multiple course number ranges", async () => {
    const res = await callWebSocAPI(
      { year: "2023", quarter: "Winter" },
      {
        department: "ECON",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("ECON");
    expect(res.schools[0].departments[0].courseNumberRangeComments.length).toBeGreaterThan(1);
  });

  test("WebSOC query for HUMAN courses in 2023 Winter includes comments for multiple section code ranges", async () => {
    const res = await callWebSocAPI(
      { year: "2023", quarter: "Winter" },
      {
        department: "HUMAN",
      },
    );
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toBe("HUMAN");
    expect(res.schools[0].departments[0].sectionCodeRangeComments.length).toBeGreaterThan(1);
  });

  test("WebSOC query for GE-2 courses in 2023 Winter includes multiple schools", async () => {
    const res = await callWebSocAPI(
      { year: "2023", quarter: "Winter" },
      {
        ge: "GE-2",
      },
    );
    expect(res.schools.length).toBeGreaterThan(1);
  });

  test("WebSOC query for CBEMS (discontinued 2019 SS2) courses in 2023 Winter is empty", async () => {
    const res = await callWebSocAPI(
      { year: "2023", quarter: "Winter" },
      {
        department: "CBEMS",
      },
    );
    expect(res.schools.length).toBe(0);
  });
});
