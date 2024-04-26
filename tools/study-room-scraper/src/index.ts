import { PrismaClient } from "@libs/db";
import type { StudyLocation } from "@peterportal-api/types";

import { scrapeStudyLocations } from "./study-room-scraper";

const prisma = new PrismaClient();

async function main() {
  const studyLocations: { [id: string]: StudyLocation } = await scrapeStudyLocations();
  const studyLocationInfo = Object.values(studyLocations).map((location) => {
    return prisma.studyLocation.create({
      data: {
        id: location.id,
        lid: location.lid,
        name: location.name,
        rooms: {
          create: location.rooms.map((room) => ({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            location: room.location,
            description: room.description,
            directions: room.directions,
            techEnhanced: room.techEnhanced,
          })),
        },
      },
    });
  });
  await prisma.$transaction([
    prisma.studyRoom.deleteMany({
      where: { studyLocationId: { in: Object.keys(studyLocations) } },
    }),
    prisma.studyLocation.deleteMany({ where: { id: { in: Object.keys(studyLocations) } } }),
    ...studyLocationInfo,
  ]);
}

main().then();
