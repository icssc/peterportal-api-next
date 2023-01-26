import { describe, expect, test } from "@jest/globals";

import { callWebSocAPI, getDeptCodes, getTerms } from "./index";

describe("websoc-api-next tests", () => {
  test("Returned array of terms includes 2023 Winter", async () => {
    expect(await getTerms()).toContain("2023 Winter");
  });
  test("Returned array of department codes includes COMPSCI", async () => {
    expect(await getDeptCodes()).toContain("COMPSCI");
  });
  test("WebSOC query for Lower Division I&C SCI courses in 2021 Fall contains I&C SCI 32A", async () => {
    const res = await callWebSocAPI({
      term: "2021 Fall",
      department: "I&C SCI",
      division: "LowerDiv",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("I&C SCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "32A"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for Upper Division COMPSCI courses in 2022 Winter includes COMPSCI 161", async () => {
    const res = await callWebSocAPI({
      term: "2022 Winter",
      department: "COMPSCI",
      division: "UpperDiv",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "161"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for Graduate/Professional COMPSCI courses in 2022 Spring includes COMPSCI 260P", async () => {
    const res = await callWebSocAPI({
      term: "2022 Spring",
      department: "COMPSCI",
      division: "Graduate",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "260P"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for COMPSCI courses in 2022 Summer Session 1 includes COMPSCI 143A", async () => {
    const res = await callWebSocAPI({
      term: "2022 Summer1",
      department: "COMPSCI",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("COMPSCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "143A"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for I&C SCI courses in 2022 10-wk Summer includes I&C SCI 31", async () => {
    const res = await callWebSocAPI({
      term: "2022 Summer10wk",
      department: "I&C SCI",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("I&C SCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "31"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for I&C SCI courses in 2022 Summer Session 2 includes I&C SCI 6B", async () => {
    const res = await callWebSocAPI({
      term: "2022 Summer2",
      department: "I&C SCI",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("I&C SCI");
    expect(
      res.schools[0].departments[0].courses.filter(
        (x) => x.courseNumber == "6B"
      ).length
    ).toEqual(1);
  });
  test("WebSOC query for ECON courses in 2023 Winter includes course number range comments", async () => {
    const res = await callWebSocAPI({
      term: "2023 Winter",
      department: "ECON",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("ECON");
    expect(
      res.schools[0].departments[0].courseNumberRangeComments.length
    ).toBeTruthy();
  });
  test("WebSOC query for HUMAN courses in 2023 Winter includes section code range comments", async () => {
    const res = await callWebSocAPI({
      term: "2023 Winter",
      department: "HUMAN",
    });
    expect(res.schools).toHaveLength(1);
    expect(res.schools[0].departments).toHaveLength(1);
    expect(res.schools[0].departments[0].deptCode).toEqual("HUMAN");
    expect(
      res.schools[0].departments[0].sectionCodeRangeComments.length
    ).toBeTruthy();
  });
  test("Malformed WebSOC query with only term provided throws error", () => {
    expect(callWebSocAPI({ term: "2023 Winter" })).rejects.toThrow();
  });
  test("Malformed WebSOC query with room number but no building provided throws error", () => {
    expect(
      callWebSocAPI({
        term: "2023 Winter",
        department: "COMPSCI",
        room: "100",
      })
    ).rejects.toThrow();
  });
});
