import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import jwtDecode from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

import { Scraper } from "./components/Scraper";

import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env["X_AUTH_TOKEN"]) throw new Error("Auth cookie not set.");
  const studentId = jwtDecode<JwtPayload>(process.env["X_AUTH_TOKEN"].slice("Bearer+".length))?.sub;
  if (!studentId || studentId.length !== 8)
    throw new Error("Could not parse student ID from auth cookie.");
  const headers = {
    "Content-Type": "application/json",
    Cookie: `X-AUTH-TOKEN=${process.env["X_AUTH_TOKEN"]}`,
    Origin: "https://reg.uci.edu",
  };
  console.log("degreeworks-scraper starting");
  const scraper = await Scraper.new(studentId, headers);
  await scraper.run();
  await mkdir(join(__dirname, "../output"), { recursive: true });
  for (const [fileName, contents] of scraper.get())
    await writeFile(
      join(__dirname, `../output/${fileName}.json`),
      JSON.stringify(Object.fromEntries(contents)),
    );
}

main().then();
