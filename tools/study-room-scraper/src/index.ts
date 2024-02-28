import { load } from "cheerio";
import fetch from "cross-fetch";
import type { Element } from "cheerio";
import * as winston from "winston";
//import { json } from "stream/consumers";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
const LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";

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

//Path:
//$('#eq-time-grid > div.fc-view-harness.fc-view-harness-passive > div > table > tbody > tr > td:nth-child(1) >
// div > div > table > tbody > tr:nth-child(THIS is element) > td > div > div > span.fc-datagrid-cell-main > a:nth-child(2) > span').text()
async function getRoomIds(libraryId: string): Promise<RoomIdMapping> {
  console.log("Scraping Rooms for library ID: ", libraryId);
  console.log("Hello");
  const url = `${LIB_SPACE_URL}?lid=${libraryId}`;
  console.log("URL:", url);
  try {
    const res = await fetch(url);
    console.log("Response Status:", res.status);
    const text = await res.text();
    console.log("Response Text:", text); 
    const $ = load(text);
    const roomIds: RoomIdMapping = {};
    console.log("Number of elements found:", $('.fc-datagrid-body.fc-scrollgrid-sync-table tbody tr').length);

    $('.fc-datagrid-body.fc-scrollgrid-sync-table tbody tr').each(function (this: Element) {
      const eid = $(this).find('td').data('resource-id') as string;
      const roomInfoElement = $(this).find(".fc-cell-text").first(); // Select the first .fc-cell-text element
      const roomInfo: string = roomInfoElement.text().trim(); // Extract text content
      console.log("Room Info:", roomInfo); // Log room information
      const matches = roomInfo.match(/^(.*?) \(Capacity (\d+)\)$/);
      console.log("Matches:", matches); // Log matches

      if (matches) {
        const name = matches[1];
        const capacity = parseInt(matches[2]);

        const room: Room = {
          id: eid.toString(),
          name: name.trim(),
          capacity: capacity,
          location: "", // Not sure how to get
        };

        roomIds[eid] = room;
      }
    });
    console.log("Room IDs:", roomIds);
    return roomIds;
  } catch (error) {
    console.error(`Error fetching room information for library ${libraryId}:`, error);
    return {};
  }
}

//Scrapes through all libraries in the library ID dictionary and returns in an "allRooms" dictionary
async function scrapeAllLibraries(): Promise<{ [name: string]: RoomIdMapping }> {
  const allRooms: { [name: string]: RoomIdMapping } = {};

  // Iterate over each library
  for (const [libraryName, libraryId] of Object.entries(libraryIds)) {
    const rooms = await getRoomIds(libraryId);
    allRooms[libraryName] = rooms;
  }
  return allRooms;
}

//test running program
async function main() {
  const allLibraryRooms = await scrapeAllLibraries();
  console.log("Room information for all libraries:", allLibraryRooms);
}

main();

