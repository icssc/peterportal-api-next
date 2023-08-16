import fetch from "cross-fetch";
import { describe, expect, it } from "vitest";

describe("Example suite", () => {
  it("should do a thing", async () => {
    const res = await fetch(`${globalThis.baseUrl}`);
    expect(res.ok).toBeFalsy();
  });
});
