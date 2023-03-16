import { copyFile, cp, mkdir, readdir, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { create } from "tar";
import { fileURLToPath } from "url";

const cwd = dirname(fileURLToPath(import.meta.url));

const targetDir = "dist/websoc-scraper-v2/";
const sourceFiles = ["ecosystem.config.js", "index.ts", "package.json"];
const dependencies = [".prisma", "db", "registrar-api", "websoc-api-next"];

(async function main() {
  await rm(join(cwd, "dist/"), { recursive: true, force: true });
  await mkdir(join(cwd, `${targetDir}node_modules`), {
    recursive: true,
  });
  await Promise.all(
    sourceFiles.map((file) =>
      copyFile(join(cwd, file), join(cwd, `${targetDir}${file}`))
    )
  );
  await Promise.all(
    dependencies.map((module) =>
      cp(
        join(cwd, `../../node_modules/${module}`),
        join(cwd, `${targetDir}node_modules/${module}`),
        { dereference: true, recursive: true }
      )
    )
  );
  await Promise.all(
    (await readdir(join(cwd, `${targetDir}node_modules/.prisma/client`)))
      .filter((x) => x.includes(".node") && !x.includes("arm64"))
      .map((x) => rm(join(cwd, `${targetDir}node_modules/.prisma/client`, x)))
  );
  await writeFile(
    join(cwd, `${targetDir}.env`),
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    `DATABASE_URL="${process.env.DATABASE_URL_SCRAPER}"\nNODE_ENV="production"\nTZ="America/Los_Angeles"`
  );
  process.chdir(join(cwd, "dist"));
  await create(
    {
      gzip: true,
      file: "websoc-scraper-v2.tar.gz",
    },
    ["websoc-scraper-v2/"]
  );
})();
