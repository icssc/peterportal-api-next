import fetch from "cross-fetch";

import type { Block, DWAuditResponse, DWMappingResponse } from "./types";

const DW_API_URL = "https://reg.uci.edu/RespDashboard/api";
const AUDIT_URL = `${DW_API_URL}/audit`;
const DELAY = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMajorAudit(
  catalogYear: string,
  degree: string,
  school: string,
  majorCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree,
      school,
      studentId,
      classes: [],
      goals: [{ code: "MAJOR", value: majorCode }],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MAJOR" && x.requirementValue === majorCode,
      );
}

export async function getMinorAudit(
  catalogYear: string,
  minorCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      studentId,
      degree: "BA",
      school: "U",
      classes: [],
      goals: [
        { code: "MAJOR", value: "000" },
        { code: "MINOR", value: minorCode },
      ],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find(
        (x) => x.requirementType === "MINOR" && x.requirementValue === minorCode,
      );
}

export async function getSpecAudit(
  catalogYear: string,
  degree: string,
  school: string,
  majorCode: string,
  specCode: string,
  studentId: string,
  headers: HeadersInit,
): Promise<Block | undefined> {
  const res = await fetch(AUDIT_URL, {
    method: "POST",
    body: JSON.stringify({
      catalogYear,
      degree,
      school,
      studentId,
      classes: [],
      goals: [
        { code: "MAJOR", value: majorCode },
        { code: "SPEC", value: specCode },
      ],
    }),
    headers,
  });
  await sleep(DELAY);
  const json: DWAuditResponse = await res.json().catch(() => ({ error: "" }));
  return "error" in json
    ? undefined
    : json.blockArray.find((x) => x.requirementType === "SPEC" && x.requirementValue === specCode);
}

export async function getMapping<T extends string>(
  path: T,
  headers: HeadersInit,
): Promise<Map<string, string>> {
  const res = await fetch(`${DW_API_URL}/${path}`, { headers });
  await sleep(DELAY);
  const json: DWMappingResponse<T> = await res.json();
  return new Map(json._embedded[path].map((x) => [x.key, x.description]));
}
