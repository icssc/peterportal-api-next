import fetch from "cross-fetch";
import { describe, expect, it } from "vitest";

describe("Example suite", () => {
  it("should do a thing", async () => {
    const res = await fetch("http://localhost:8080/");
    expect(res.ok).toBeFalsy();
  });
});
