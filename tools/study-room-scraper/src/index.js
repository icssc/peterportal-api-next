"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var cheerio_1 = require("cheerio");
var cross_fetch_1 = require("cross-fetch");
var winston = require("winston");
//import { json } from "stream/consumers";
var LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces";
var LIB_SPACE_AVAILABILITY_URL = "https://spaces.lib.uci.edu/spaces/availability/grid";
var ROOM_SPACE_URL = "https://spaces.lib.uci.edu/space/";
//Libraries with paired library IDs
var libraryIds = {
    "Langson Library": "6539",
    "Gateway Study Center": "6579",
    "Science Library": "6580",
    "Multimedia Resources Center": "6581",
    "Grunigen Medical Library": "12189",
};
var logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format.prettyPrint()),
    transports: [new winston.transports.Console()],
});
function requestSpaces(lid, start, end) {
    return __awaiter(this, void 0, void 0, function () {
        var headers, params, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    headers = {
                        Referer: "".concat(LIB_SPACE_URL, "?lid=").concat(lid),
                    };
                    params = new URLSearchParams();
                    params.append("lid", lid);
                    params.append("gid", "0");
                    params.append("start", start);
                    params.append("end", end);
                    params.append("pageSize", "18"); // pageSize doesn't seem to affect query but is required
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, cross_fetch_1.default)(LIB_SPACE_AVAILABILITY_URL, {
                            method: "POST",
                            headers: headers,
                            body: params,
                        }).then(function (res) { return res.json(); })];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_1 = _a.sent();
                    logger.error(error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getStudyLocationIds() {
    return __awaiter(this, void 0, void 0, function () {
        var studyLocationIds, response, $;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    studyLocationIds = {};
                    return [4 /*yield*/, (0, cross_fetch_1.default)(LIB_SPACE_URL)];
                case 1: return [4 /*yield*/, (_a.sent()).text()];
                case 2:
                    response = _a.sent();
                    $ = (0, cheerio_1.load)(response);
                    $("#lid option").each(function () {
                        var locationId = $(this).attr("value");
                        var locationName = $(this).text().trim();
                        // Ignore last option
                        if (locationId && locationId !== "0") {
                            studyLocationIds[locationId] = locationName;
                        }
                    });
                    console.log(studyLocationIds);
                    return [2 /*return*/, studyLocationIds];
            }
        });
    });
}
// TODO: Get room id Mappings
//Path:
//$('#eq-time-grid > div.fc-view-harness.fc-view-harness-passive > div > table > tbody > tr > td:nth-child(1) >
// div > div > table > tbody > tr:nth-child(THIS is element) > td > div > div > span.fc-datagrid-cell-main > a:nth-child(2) > span').text()
// async function getRoomIds(libraryId: string): Promise<RoomIdMapping> {
//   console.log("Scraping Rooms for library ID: ", libraryId);
//   console.log("Hello");
//   const url = `${LIB_SPACE_URL}?lid=${libraryId}`;
//   console.log("URL:", url);
//   try {
//     const res = await fetch(url);
//     console.log("Response Status:", res.status);
//     const text = await res.text();
//     console.log("Response Text:", text); 
//     const $ = load(text);
//     const roomIds: RoomIdMapping = {};
//     console.log("Number of elements found:", $('.fc-datagrid-body.fc-scrollgrid-sync-table tbody tr').length);
//     $('.fc-datagrid-body.fc-scrollgrid-sync-table tbody tr').each(function (this: Element) {
//       const eid = $(this).find('td').data('resource-id') as string;
//       const roomInfoElement = $(this).find(".fc-cell-text").first(); // Select the first .fc-cell-text element
//       const roomInfo: string = roomInfoElement.text().trim(); // Extract text content
//       console.log("Room Info:", roomInfo); // Log room information
//       const matches = roomInfo.match(/^(.*?) \(Capacity (\d+)\)$/);
//       console.log("Matches:", matches); // Log matches
//       if (matches) {
//         const name = matches[1];
//         const capacity = parseInt(matches[2]);
//         const room: Room = {
//           id: eid.toString(),
//           name: name.trim(),
//           capacity: capacity,
//           location: "", // Not sure how to get
//         };
//         roomIds[eid] = room;
//       }
//     });
//     console.log("Room IDs:", roomIds);
//     return roomIds;
//   } catch (error) {
//     console.error(`Error fetching room information for library ${libraryId}:`, error);
//     return {};
//   }
// }
// //Scrapes through all libraries in the library ID dictionary and returns in an "allRooms" dictionary
// async function scrapeAllLibraries(): Promise<{ [name: string]: RoomIdMapping }> {
//   const allRooms: { [name: string]: RoomIdMapping } = {};
//   // Iterate over each library
//   for (const [libraryName, libraryId] of Object.entries(libraryIds)) {
//     const rooms = await getRoomIds(libraryId);
//     allRooms[libraryName] = rooms;
//   }
//   return allRooms;
// }
function getRoomInfo(RoomId) {
    return __awaiter(this, void 0, void 0, function () {
        var url, room, res, text, $, roomHeader, roomName, capacityText, capacityMatch, capacity, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Scraping Room for Info: ", RoomId);
                    url = "".concat(ROOM_SPACE_URL, "?lid=").concat(RoomId);
                    room = {
                        id: RoomId,
                        name: "",
                        capacity: 0,
                        location: ""
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, cross_fetch_1.default)(url)];
                case 2:
                    res = _a.sent();
                    console.log("Response Status:", res.status);
                    return [4 /*yield*/, res.text()];
                case 3:
                    text = _a.sent();
                    console.log("Response Text:", text);
                    $ = (0, cheerio_1.load)(text);
                    roomHeader = $('#s-lc-public-header-title');
                    roomName = roomHeader.find('h1').text().trim();
                    capacityText = roomHeader.find('small:contains("Capacity")').text().trim();
                    capacityMatch = capacityText.match(/Capacity: (\d+)/);
                    capacity = capacityMatch ? parseInt(capacityMatch[1]) : 0;
                    room.name = roomName;
                    room.capacity = capacity;
                    console.log("Room ".concat(RoomId, ":"), room);
                    return [2 /*return*/, room];
                case 4:
                    error_2 = _a.sent();
                    console.error("Error fetching room information for room ".concat(RoomId, ":"), error_2);
                    return [2 /*return*/, room];
                case 5: return [2 /*return*/];
            }
        });
    });
}
//test running program
// async function main() {
//   const allLibraryRooms = await scrapeAllLibraries();
//   console.log("Room information for all libraries:", allLibraryRooms);
// }
getRoomInfo("44696");
