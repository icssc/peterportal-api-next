import { load } from "cheerio";
import fetch from "cross-fetch";
import type { Element } from "cheerio";
import * as winston from "winston";
//import { json } from "stream/consumers";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
const LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";
const ROOM_SPACE_URL = "https://spaces.lib.uci.edu/space"

//Libraries with paired library IDs
const libraryIds: { [name: string]: string } = {
  "Langson Library": "6539",
  "Gateway Study Center": "6579",
  "Science Library": "6580",
  "Multimedia Resources Center": "6581",
  "Grunigen Medical Library": "12189",
};

export type Room = {
  id: string;
  name: string;
  capacity: number;
  location: string;
  directions: string,
  description: string,
  startTime?: string;
  endTime?: string;
  techEnhanced?: boolean;
};

export type StudyLocation = {
  id: string;
  name: string;
  availableRooms?: Room[];
};

type RoomIdMapping = {
  [id: string]: Room;
};

type StudyLocationIdMapping = {
  [id: string]: string;
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

async function getStudyLocationIds(): Promise<StudyLocationIdMapping> {
  const studyLocationIds: StudyLocationIdMapping = {};
  const response = await (await fetch(LIB_SPACE_URL)).text();
  const $ = load(response);
  $("#lid option").each(function (this: Element) {
    const locationId = $(this).attr("value");
    const locationName = $(this).text().trim();
    // Ignore last option
    if (locationId && locationId !== "0") {
      studyLocationIds[locationId] = locationName;
    }
  });
  console.log(studyLocationIds);
  return studyLocationIds;
}

async function getRoomInfo(RoomId: string): Promise<Room> {
  console.log("Scraping Room for Info: ", RoomId);
  const url = `${ROOM_SPACE_URL}/${RoomId}`;
  const room: Room = {
    id: RoomId,
    name: "",
    capacity: 0,
    location: "",
    directions: "",
    description: "",
    techEnhanced: false,
  };
  try {
    const res = await fetch(url);
    const text = await res.text();
    const $ = load(text);
    
    //Room Header
    const roomHeader = $('#s-lc-public-header-title');
    const roomHeaderText = roomHeader.text().trim()
    // const roomNameRegex = /^\s*([\w\s]+)(?:\s*\(\s*Tech Enhanced\s*\))?\s*$/;

    // // Extract room name from the header text
    // const roomNameMatch = roomHeaderText.match(roomNameRegex);
    // const roomName = roomNameMatch ? roomNameMatch[1].trim() : "";

    // Room Name
    const roomNameRegex = /^\s*([\w\s]+)/;
    const roomNameMatch = roomHeaderText.match(roomNameRegex);
    const roomName = roomNameMatch ? roomNameMatch[1].trim() : "";

    // Check if "(Tech Enhanced)" exists in the room name
    const isTechEnhanced = /Tech Enhanced/i.test(roomHeaderText);
    
    //Room Location
    const locationText = roomHeader.find('small:first-of-type').text().trim();
    const locationRegex = /\(([^)]+)\)/;
    const locationMatch = locationText.match(locationRegex);
    const location = locationMatch ? locationMatch[1].trim() : "";

    //Room Capacity
    const capacityText = roomHeader.find('small:contains("Capacity")').text().trim();
    const capacityMatch = capacityText.match(/Capacity: (\d+)/);
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : 0;

    //Room Directions
    const directionsHeader = $('.s-lc-section-directions');
    const directionsText = directionsHeader.find('p').text().trim();

    //Room Description
    const descriptionHeader = $('.s-lc-section-description');
    const descriptionText = descriptionHeader.find('p')
      .filter((index, element) => $(element).text().trim() !== '') // Filter out empty <p> tags
      .map((index, element) => $(element).text().trim()) // Extract text content of non-empty <p> tags
      .get() // Convert jQuery object to array
      .join(' '); // Concatenate descriptions


    room.name = roomName.trim();
    room.capacity = capacity;
    room.location = location.trim();
    room.directions = directionsText.trim();
    room.description = descriptionText
    room.techEnhanced = isTechEnhanced
    // console.log(roomName)
    console.log(`Room ${RoomId}:`, room)
    return room
    }
    catch (error) {
      console.error(`Error fetching room information for room ${RoomId}:`, error);
      return room
    }
  } 
  
getRoomInfo("117634")
