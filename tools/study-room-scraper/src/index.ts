import type { StudyRoom } from "@anteater-api/types";
import { PrismaClient } from "@libs/db";

import { scrapeStudyLocations } from "./study-room-scraper";

const prisma = new PrismaClient();

async function main() {
  const studyLocations = await scrapeStudyLocations();
  const studyLocationInfo = Object.values(studyLocations).map((location) => {
    return prisma.studyLocation.create({
      data: {
        id: location.id,
        lid: location.lid,
        name: location.name,
        rooms: {
          create: location.rooms.map((room: StudyRoom) => ({
            ...room,
          })),
        },
      },
    });
  });
  await prisma.$transaction([
    prisma.studyRoom.deleteMany({}),
    prisma.studyLocation.deleteMany({}),
    ...studyLocationInfo,
  ]);
}

main().then();
