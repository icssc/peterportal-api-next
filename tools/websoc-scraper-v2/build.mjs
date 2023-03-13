import { copyFile, cp, mkdir, readdir, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { c } from "tar";
import { fileURLToPath } from "url";

const cwd = dirname(fileURLToPath(import.meta.url));

(async function main() {
  await rm(join(cwd, "dist/"), { recursive: true, force: true });
  for (const dir of [
    "dist/",
    "dist/websoc-scraper-v2/",
    "dist/websoc-scraper-v2/node_modules",
  ]) {
    await mkdir(join(cwd, dir));
  }
  await Promise.all(
    ["ecosystem.config.js", "index.ts", "package.json"].map((file) =>
      copyFile(join(cwd, file), join(cwd, `dist/websoc-scraper-v2/${file}`))
    )
  );
  await Promise.all(
    [".prisma", "db", "registrar-api", "websoc-api-next"].map((module) =>
      cp(
        join(cwd, `../../node_modules/${module}`),
        join(cwd, `dist/websoc-scraper-v2/node_modules/${module}`),
        { dereference: true, recursive: true }
      )
    )
  );
  await Promise.all(
    (
      await readdir(
        join(cwd, "dist/websoc-scraper-v2/node_modules/.prisma/client")
      )
    )
      .filter((x) => x.includes(".node"))
      .filter((x) => !x.includes("arm64"))
      .map((x) =>
        rm(join(cwd, "dist/websoc-scraper-v2/node_modules/.prisma/client", x))
      )
  );
  await writeFile(
    join(cwd, "dist/websoc-scraper-v2/.env"),
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `DATABASE_URL="${process.env.DATABASE_URL_SCRAPER}"\nNODE_ENV="production"\nTZ="America/Los_Angeles"`
  );
  process.chdir(join(cwd, "dist"));
  await c(
    {
      gzip: true,
      file: "websoc-scraper-v2.tar.gz",
    },
    ["websoc-scraper-v2/"]
  );
})();
