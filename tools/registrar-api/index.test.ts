import { describe, expect, test } from "@jest/globals";

import { getTermDateData } from "./index";

describe("registrar-api tests", () => {
  test("getTermData on invalid year throws error", () => {
    expect(getTermDateData("0")).rejects.toThrow();
  });
  test("getTermData on non-numeric year throws error", () => {
    expect(getTermDateData("asdf")).rejects.toThrow();
  });
  test("getTermData return for 2022-23 AY is correct", async () => {
    const data = await getTermDateData("2022");
    expect(data["2022 Fall"]).toEqual({
      scheduleAvailable: new Date(2022, 3, 30),
      enrollmentStart: new Date(2022, 4, 16),
      instructionStart: new Date(2022, 8, 22),
      unrestrictedEnrollmentEnd: new Date(2022, 9, 7),
      enrollmentEnd: new Date(2022, 11, 2),
      instructionEnd: new Date(2022, 11, 2),
      finalsStart: new Date(2022, 11, 3),
      finalsEnd: new Date(2022, 11, 9),
    });
    expect(data["2023 Winter"]).toEqual({
      scheduleAvailable: new Date(2022, 9, 29),
      enrollmentStart: new Date(2022, 10, 14),
      instructionStart: new Date(2023, 0, 9),
      unrestrictedEnrollmentEnd: new Date(2023, 0, 20),
      enrollmentEnd: new Date(2023, 2, 17),
      instructionEnd: new Date(2023, 2, 17),
      finalsStart: new Date(2023, 2, 18),
      finalsEnd: new Date(2023, 2, 24),
    });
    expect(data["2023 Spring"]).toEqual({
      scheduleAvailable: new Date(2023, 1, 11),
      enrollmentStart: new Date(2023, 1, 27),
      instructionStart: new Date(2023, 3, 3),
      unrestrictedEnrollmentEnd: new Date(2023, 3, 14),
      enrollmentEnd: new Date(2023, 5, 9),
      instructionEnd: new Date(2023, 5, 9),
      finalsStart: new Date(2023, 5, 10),
      finalsEnd: new Date(2023, 5, 15),
    });
    expect(data["2023 Summer1"]).toEqual({
      scheduleAvailable: new Date(2023, 2, 1),
      enrollmentStart: new Date(2023, 2, 1),
      instructionStart: new Date(2023, 5, 26),
      unrestrictedEnrollmentEnd: new Date(2023, 5, 30),
      enrollmentEnd: new Date(2023, 6, 14),
      instructionEnd: new Date(2023, 7, 1),
      finalsStart: new Date(2023, 7, 2),
      finalsEnd: new Date(2023, 7, 3),
    });
    expect(data["2023 Summer10wk"]).toEqual({
      scheduleAvailable: new Date(2023, 2, 1),
      enrollmentStart: new Date(2023, 2, 1),
      instructionStart: new Date(2023, 5, 26),
      unrestrictedEnrollmentEnd: new Date(2023, 6, 7),
      enrollmentEnd: new Date(2023, 7, 4),
      instructionEnd: new Date(2023, 7, 31),
      finalsStart: new Date(2023, 8, 1),
      finalsEnd: new Date(2023, 8, 1),
    });
    expect(data["2023 Summer2"]).toEqual({
      scheduleAvailable: new Date(2023, 2, 1),
      enrollmentStart: new Date(2023, 2, 1),
      instructionStart: new Date(2023, 7, 7),
      unrestrictedEnrollmentEnd: new Date(2023, 7, 11),
      enrollmentEnd: new Date(2023, 7, 25),
      instructionEnd: new Date(2023, 8, 11),
      finalsStart: new Date(2023, 8, 12),
      finalsEnd: new Date(2023, 8, 13),
    });
  });
});
