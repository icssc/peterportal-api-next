import type { StudyRoom, StudyLocation } from "@peterportal-api/types";
import { load } from "cheerio";
import fetch from "cross-fetch";
import { studyLocations, getStudySpaces } from "libs/uc-irvine-lib/src/spaces";
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
      room.directions = directionsText.trim();
      if (!room.directions.endsWith(".")) {
        room.directions += ".";
      }
    }

    const descriptionHeader = $(".s-lc-section-description");
    let descriptionText = "";
    if (room.location === "Grunigen Medical Library") {
      // Specific processing for the Grunigen Library case
      descriptionHeader.find("p").each(function () {
        let paraText = $(this).text().trim();
        if (paraText.includes("\n")) {
          paraText = paraText.replaceAll("\n", ", ");
          if (!paraText.endsWith(":")) {
            paraText += ". ";
          }
        }
        descriptionText += paraText + " ";
      });
      descriptionText = descriptionText.replace(/\s{2,}/g, " ").trim(); // Remove extra spaces
      descriptionText = descriptionText.replace(/\s+,/g, ","); // Remove spaces before commas
      descriptionText = descriptionText.replace(/\.\s*\./g, "."); // Remove extra periods
      descriptionText = descriptionText.replace(".,", "."); // Remove commas after periods
    } else {
      // General processing for other rooms
      const descriptionParts: string[] = [];
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

      descriptionText = combinedDescription.trim();
    }

    if (descriptionText) {
      room.description = descriptionText;
      if (!room.description.endsWith(".")) {
        room.description += ".";
      }
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
  const studyLocationsMap: StudyLocations = {};
  const rids: Set<string> = new Set();
  for (const lib in studyLocations) {
    const studyLocation: StudyLocation = {
      id: lib,
      lid: studyLocations[lib].lid,
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
    studyLocationsMap[`${studyLocation.id}`] = studyLocation;
  }
  return studyLocationsMap;
}
