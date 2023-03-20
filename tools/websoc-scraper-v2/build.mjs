import { copyFile, cp, mkdir, readdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const targetDir = "dist/";
const sourceFiles = ["ecosystem.config.js", "index.ts", "package.json"];
const dependencies = [".prisma", "db", "registrar-api", "websoc-api-next"];

async function buildApp() {
  await rm(join(cwd, targetDir), { recursive: true, force: true });
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
  const prismaFiles = await readdir(
    join(cwd, `${targetDir}node_modules/.prisma/client`)
  );
  await Promise.all(
    prismaFiles
      .filter((x) => x.includes(".node") && !x.includes("debian-openssl-1.1.x"))
      .map((x) => rm(join(cwd, `${targetDir}node_modules/.prisma/client`, x)))
  );
}

buildApp();
