import { describe, expect, test } from "@jest/globals";

import { callWebSocAPI, getDeptCodes, getTerms } from "./index";

describe("websoc-api-next tests", () => {
  test("returned array of terms includes 2023 Winter", async () => {
    expect(await getTerms()).toContain("2023 Winter");
  });
  test("returned array of departments codes includes COMPSCI", async () => {
    expect(await getDeptCodes()).toContain("COMPSCI");
  });
});
