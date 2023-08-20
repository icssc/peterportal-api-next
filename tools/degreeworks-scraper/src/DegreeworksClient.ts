import fetch from "cross-fetch";

import { sleep } from "./lib";
import type { Block, DWAuditResponse, DWMappingResponse } from "./types";

export class DegreeworksClient {
  private static readonly API_URL = "https://reg.uci.edu/RespDashboard/api";
  private static readonly AUDIT_URL = `${DegreeworksClient.API_URL}/audit`;
  private catalogYear: string = "";
  constructor(
    private readonly studentId: string,
    private readonly headers: HeadersInit,
    private readonly delay: number = 1000,
  ) {
    /**
     * Depending on when we are scraping, this may be the academic year that started
     * the previous calendar year, or the one that will start this calendar year.
     *
     * We determine the catalog year by seeing if we can fetch the major data for the
     * B.S. in Computer Science for the latter. If it is available, then we use that
     * as the catalog year. Otherwise, we use the former.
     */
    const currentYear = new Date().getUTCFullYear();
    this.getMajorAudit("BS", "U", "201").then((x) => {
      this.catalogYear = x
        ? `${currentYear}${currentYear + 1}`
        : `${currentYear - 1}${currentYear}`;
      console.log(`[DegreeworksClient] Set catalogYear to ${this.catalogYear}`);
    });
  }
  async getMajorAudit(
    degree: string,
    school: string,
    majorCode: string,
  ): Promise<Block | undefined> {
    const res = await fetch(DegreeworksClient.AUDIT_URL, {
      method: "POST",
      body: JSON.stringify({
        catalogYear: this.catalogYear,
        degree,
        school,
        studentId: this.studentId,
        classes: [],
        goals: [{ code: "MAJOR", value: majorCode }],
      }),
      headers: this.headers,
    });
    const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
    return "error" in json
      ? undefined
      : json.blockArray.find(
          (x) => x.requirementType === "MAJOR" && x.requirementValue === majorCode,
        );
  }

  async getMinorAudit(minorCode: string): Promise<Block | undefined> {
    const res = await fetch(DegreeworksClient.AUDIT_URL, {
      method: "POST",
      body: JSON.stringify({
        catalogYear: this.catalogYear,
        studentId: this.studentId,
        degree: "BA",
        school: "U",
        classes: [],
        goals: [
          { code: "MAJOR", value: "000" },
          { code: "MINOR", value: minorCode },
        ],
      }),
      headers: this.headers,
    });
    const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
    return "error" in json
      ? undefined
      : json.blockArray.find(
          (x) => x.requirementType === "MINOR" && x.requirementValue === minorCode,
        );
  }

  async getSpecAudit(
    degree: string,
    school: string,
    majorCode: string,
    specCode: string,
  ): Promise<Block | undefined> {
    const res = await fetch(DegreeworksClient.AUDIT_URL, {
      method: "POST",
      body: JSON.stringify({
        catalogYear: this.catalogYear,
        degree,
        school,
        studentId: this.studentId,
        classes: [],
        goals: [
          { code: "MAJOR", value: majorCode },
          { code: "SPEC", value: specCode },
        ],
      }),
      headers: this.headers,
    });
    const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
    return "error" in json
      ? undefined
      : json.blockArray.find(
          (x) => x.requirementType === "SPEC" && x.requirementValue === specCode,
        );
  }

  async getMapping<T extends string>(path: T): Promise<Map<string, string>> {
    const res = await fetch(`${DegreeworksClient.API_URL}/${path}`, { headers: this.headers });
    await sleep(this.delay);
    const json: DWMappingResponse<T> = await res.json();
    return new Map(json._embedded[path].map((x) => [x.key, x.description]));
  }
}
