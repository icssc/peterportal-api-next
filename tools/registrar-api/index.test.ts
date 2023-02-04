import { describe, expect, test } from "@jest/globals";

import { getTermData } from "./index";

describe("registrar-api tests", () => {
  test("getTermData on invalid year throws error", () => {
    expect(getTermData("0")).rejects.toThrow();
  });
});
