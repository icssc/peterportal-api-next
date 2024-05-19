import { PrismaClient } from "@libs/db";

import { Scraper } from "./components";

import "dotenv/config";

const prisma = new PrismaClient();

type Division = "Undergraduate" | "Graduate";

async function main() {
  if (!process.env["X_AUTH_TOKEN"]) throw new Error("Auth cookie not set.");
  const scraper = await Scraper.new(process.env["X_AUTH_TOKEN"]);
  await scraper.run();
  const {
    degreesAwarded,
    parsedSpecializations,
    parsedGradPrograms,
    parsedMinorPrograms,
    parsedUgradPrograms,
  } = scraper.get();
  const degreeData = Array.from(degreesAwarded.entries()).map(([id, name]) => ({
    id,
    name,
    division: (id.startsWith("B") ? "Undergraduate" : "Graduate") as Division,
  }));
  const majorData = [
    ...Array.from(parsedUgradPrograms.values()),
    ...Array.from(parsedGradPrograms.values()),
  ].map(({ name, degreeType, code, requirements }) => ({
    id: `${degreeType}-${code}`,
    degreeId: degreeType!,
    code,
    name,
    requirements,
  }));
  const minorData = Array.from(parsedMinorPrograms.values()).map(
    ({ name, code: id, requirements }) => ({ id, name, requirements }),
  );
  const specData = Array.from(parsedSpecializations.values()).map(
    ({ name, degreeType, code, requirements }) => ({
      id: `${degreeType}-${code}`,
      majorId: `${degreeType}-${code.slice(0, code.length - 1)}`,
      name,
      requirements,
    }),
  );
  await prisma.$transaction([
    prisma.degree.createMany({ data: degreeData, skipDuplicates: true }),
    prisma.major.createMany({ data: majorData, skipDuplicates: true }),
    prisma.minor.createMany({ data: minorData, skipDuplicates: true }),
    prisma.specialization.createMany({ data: specData, skipDuplicates: true }),
  ]);
}

main().then();
