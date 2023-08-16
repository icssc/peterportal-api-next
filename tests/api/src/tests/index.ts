import { it } from "@fixtures";
import { describe } from "vitest";

describe("Example suite", () => {
  it("should do a thing", ({ app }) => {
    app.get("/").expect(400);
  });
  it("should do another thing", ({ app }) => {
    app.get("/v1/rest/courses/COMPSCI161").expect(200);
  });
});
