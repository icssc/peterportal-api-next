import fetch from "cross-fetch";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
const LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";

/**
 * Shortened libary names mapped to their IDs used by spaces.lib.uci.edu
 * See https://www.lib.uci.edu/ for shortened names
 **/
export const studyLocations: { [id: string]: { name: string; lid: string } } = {
  Langson: { name: "Langson Library", lid: "6539" },
  Gateway: { name: "Gateway Study Center", lid: "6579" },
  Science: { name: "Science Library", lid: "6580" },
  MRC: { name: "Multimedia Resources Center", lid: "6581" },
  GML: { name: "Grunigen Medical Library", lid: "12189" },
};

/**
 * Make post request used by "https://spaces.lib.uci.edu/spaces" to retrieve room availability.
 *
 * @param lid - Library ID
 * @param start - Date format YYYY-MM-DD
 * @param end - Date format YYYY-MM-DD
 * @returns {object} JSON response returned by request
 */
export async function getStudySpaces(lid: string, start: string, end: string) {
  const headers = {
    Referer: `${LIB_SPACE_URL}?lid=${lid}`,
  };
  const params = new URLSearchParams();
  params.append("lid", lid);
  params.append("gid", "0");
  params.append("start", start);
  params.append("end", end);
  params.append("pageSize", "18"); // pageSize doesn't seem to affect query but is required
  return await fetch(LIB_SPACE_AVAILABILITY_URL, {
    method: "POST",
    headers: headers,
    body: params,
  }).then((res) => res.json());
}
