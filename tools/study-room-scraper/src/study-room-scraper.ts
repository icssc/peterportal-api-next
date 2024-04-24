import type { StudyRoom, StudyLocation } from "@peterportal-api/types";
import { load } from "cheerio";
import fetch from "cross-fetch";
import * as winston from "winston";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
const LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";
const ROOM_SPACE_URL = "https://spaces.lib.uci.edu/space";

//Libraries with paired library IDs
const libraryIds: { [name: string]: string } = {
  "Langson Library": "6539",
  "Gateway Study Center": "6579",
  "Science Library": "6580",
  "Multimedia Resources Center": "6581",
  "Grunigen Medical Library": "12189",
};

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

async function requestSpaces(lid: string, start: string, end: string) {
  /**
   * Make post request used by "https://spaces.lib.uci.edu/spaces" to retrieve room availability.
   *
   * @param lid - Library ID
   * @param start - Date format YYYY-MM-DD
   * @param end - Date format YYYY-MM-DD
   * @returns {object} JSON response returned by request
   */
  const headers = {
    Referer: `${LIB_SPACE_URL}?lid=${lid}`,
  };
  const params = new URLSearchParams();
  params.append("lid", lid);
  params.append("gid", "0");
  params.append("start", start);
  params.append("end", end);
  params.append("pageSize", "18"); // pageSize doesn't seem to affect query but is required
  try {
    return await fetch(LIB_SPACE_AVAILABILITY_URL, {
      method: "POST",
      headers: headers,
      body: params,
    }).then((res) => res.json());
  } catch (error) {
    logger.error(error);
  }
}

async function getRoomInfo(RoomId: string): Promise<StudyRoom> {
  console.log("Scraping Room for Info: ", RoomId);
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
    //Room Description
    const descriptionHeader = $(".s-lc-section-description");
    const descriptionText = descriptionHeader
      .find("p")
      .filter((_, element) => $(element).text().trim() !== "") // Filter out empty <p> tags
      .map((_, element) => $(element).text().trim()) // Extract text content of non-empty <p> tags
      .get() // Convert jQuery object to array
      .join(" "); // Concatenate descriptions
    if (descriptionText) {
      room.description = descriptionText;
    }
    console.log(`Room ${RoomId}:`, room);
    return room;
  } catch (error) {
    console.error(`Error fetching room information for room ${RoomId}:`, error);
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
  date.setDate(date.getDate() + 1);
  const end = date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const studyLocations: StudyLocations = {};
  const rids: Set<string> = new Set();
  for (const lib in libraryIds) {
    const studyLocation: StudyLocation = {
      id: libraryIds[lib],
      name: lib,
      rooms: [],
    };
    const res = await requestSpaces(studyLocation.id, start, end);
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
