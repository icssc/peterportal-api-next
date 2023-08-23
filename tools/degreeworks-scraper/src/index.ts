import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Scraper } from "./components/Scraper";

import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const scraper = await Scraper.new();
  await scraper.run();
  await mkdir(join(__dirname, "../output"), { recursive: true });
  for (const [fileName, contents] of scraper.get())
    await writeFile(
      join(__dirname, `../output/${fileName}.json`),
      JSON.stringify(Object.fromEntries(contents)),
    );
}

main().then();
