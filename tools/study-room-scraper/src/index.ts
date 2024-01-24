import { load } from "cheerio";
import fetch from "cross-fetch";
import type { Element } from "cheerio";
import winston from "winston";
import { json } from "stream/consumers";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
const LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";

export type Room = {
  id: string;
  name: string;
  capacity: number;
  location: string;
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

// TODO: Get room id Mappings
