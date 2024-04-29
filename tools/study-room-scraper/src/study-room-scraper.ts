import type { StudyRoom, StudyLocation } from "@peterportal-api/types";
import { load } from "cheerio";
import fetch from "cross-fetch";
import { studyLocationIds, getStudySpaces } from "libs/uc-irvine-lib/src/spaces";
import * as winston from "winston";

const ROOM_SPACE_URL = "https://spaces.lib.uci.edu/space";

type StudyLocations = {
  [id: string]: StudyLocation;
};

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint(),
  ),
  transports: [new winston.transports.Console()],
});

async function getRoomInfo(RoomId: string): Promise<StudyRoom> {
  const url = `${ROOM_SPACE_URL}/${RoomId}`;
  const room: StudyRoom = {
    id: `${RoomId}`,
    name: "",
    capacity: 0,
    location: "",
  };
  try {
    const res = await fetch(url);
    const text = await res.text();
    const $ = load(text);

    //Room Header
    const roomHeader = $("#s-lc-public-header-title");
    const roomHeaderText = roomHeader.text().trim();
    const headerMatch = roomHeaderText.match(
      /^(.*?)\s*(\(Tech Enhanced\))?\s*\n*\s*\((.*?)\)\s*\n*\s*Capacity:\s(\d+)/,
    );
    if (headerMatch) {
      room.name = headerMatch[1].trim();
      if (headerMatch[2]) {
        room.techEnhanced = true;
      }
      room.location = headerMatch[3].trim();
      room.capacity = parseInt(headerMatch[4], 10);
    }
    //Room Directions
    const directionsHeader = $(".s-lc-section-directions");
    const directionsText = directionsHeader.find("p").text().trim();
    if (directionsText) {
      room.directions = directionsText;
    }

    const descriptionHeader = $(".s-lc-section-description");
    let descriptionText = "";

    if (RoomId === "116383") {
      // Specific processing for the Grunigen Library case
      descriptionText = descriptionHeader
        .text()
        .trim()
        .replace(/^Description\s*/i, "")
        .replace(/\s*\n+\s*/g, " ")
        .replace(/Room Uses:/g, "Room Uses: ")
        .replace(/Meetings/g, "Meetings,")
        .replace(/Study groups/g, "Study groups,")
        .replace(
          /Video conferencing for users with a zoom or skype account/g,
          "Video conferencing for users with a zoom or skype account.",
        )
        .replace(
          /Open to UCI faculty, staff and students with current UCIMC badge\./g,
          "Open to UCI faculty, staff, and students with current UCIMC badge.",
        )
        .replace(
          /All meeting attendees must have their UCIMC badge to access the Study Room/g,
          "All meeting attendees must have their UCIMC badge to access the Study Room.",
        )
        .replace(/Power Available/g, "Power Available.")
        .replace(/\s{2,}/g, " ")
        .replace(/,\s*\./g, ".");
    } else {
      // General processing for other rooms
      const descriptionParts = [];
      let combinedDescription = "";

      descriptionHeader.contents().each((_, content) => {
        if (content.nodeType === 3) {
          const textContent = $(content).text().trim();
          if (textContent) {
            descriptionParts.push(textContent);
          }
        } else if (content.nodeType === 1) {
          const child = $(content);
          if (child.is("p, ul, li, strong, em, span, br")) {
            if (child.is("ul")) {
              child.find("li").each((_, li) => {
                descriptionParts.push("- " + $(li).text().trim());
              });
            } else if (child.is("br")) {
              descriptionParts.push("\n");
            } else {
              descriptionParts.push(child.text().trim());
            }
          }
        }
      });

      // join parts and replace newline placeholders with commas
      combinedDescription = descriptionParts.join(" ").replace(/\n+/g, ", ");

      // clean up
      combinedDescription = combinedDescription
        .replace(/\s*,\s*/g, ", ")
        .replace(/\s*\.\s*/g, ". ")
        .replace(/\s{2,}/g, " ")
        .replace(/\.,/g, ".")
        .replace(/\.\s*\./g, ".");

      // description ends with a single period
      combinedDescription = combinedDescription.replace(/\.\s*$/, ".");

      descriptionText = combinedDescription;
    }

    if (descriptionText) {
      room.description = descriptionText;
    }

    logger.info(`Scraped Room ${RoomId}`, { room });
    return room;
  } catch (error) {
    logger.error(`Error fetching room information for room ${RoomId}`, { error });
    return room;
  }
}

export async function scrapeStudyLocations(): Promise<StudyLocations> {
  const date = new Date();
  const start = date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  date.setDate(date.getDate() + 3);
  const end = date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const studyLocations: StudyLocations = {};
  const rids: Set<string> = new Set();
  for (const lib in studyLocationIds) {
    const studyLocation: StudyLocation = {
      id: lib,
      lid: studyLocationIds[lib].lid,
      name: lib,
      rooms: [],
    };
    const res = await getStudySpaces(studyLocation.lid, start, end);
    for (const room of res.slots) {
      if (rids.has(room.itemId)) {
        continue;
      }
      studyLocation.rooms.push(await getRoomInfo(room.itemId));
      rids.add(room.itemId);
    }
    studyLocations[`${studyLocation.id}`] = studyLocation;
  }
  return studyLocations;
}
