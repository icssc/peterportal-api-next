import { copyFile, cp, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const targetDir = "dist/";
const sourceFiles = ["index.ts", "lib.ts", "main.sh", "package.json"];
const dependencies = ["@libs/db"];
const scrapers = ["course-scraper", "instructor-scraper", "prereq-scraper"];

async function buildApp() {
  console.log("🔨 Starting unified-scraper build");
  await rm(join(__dirname, "node_modules/"), { recursive: true, force: true });
  await rm(join(__dirname, targetDir), { recursive: true, force: true });
  await mkdir(join(__dirname, `${targetDir}node_modules`), { recursive: true });
  await Promise.all(
    sourceFiles.map((file) =>
      copyFile(join(__dirname, file), join(__dirname, `${targetDir}${file}`))
    )
  );
  await Promise.all(
    dependencies.map((module) =>
      cp(
        join(__dirname, `../../node_modules/${module}`),
        join(__dirname, `${targetDir}node_modules/${module}`),
        { dereference: true, recursive: true }
      )
    )
  );
  await Promise.all(
    scrapers.map((module) =>
      cp(join(__dirname, `../${module}`), join(__dirname, `${targetDir}node_modules/${module}`), {
        dereference: true,
        recursive: true,
      })
    )
  );
  await Promise.all(
    dependencies.map((module) =>
      rm(join(__dirname, `${targetDir}node_modules/${module}/node_modules`), {
        recursive: true,
        force: true,
      })
    )
  );
  await Promise.all(
    scrapers.map((module) =>
      rm(join(__dirname, `${targetDir}node_modules/${module}/node_modules`), {
        recursive: true,
        force: true,
      })
    )
  );
  console.log(
    "✅ Build complete! Remember to run pnpm install after deploying the Docker container."
  );
}

buildApp();
