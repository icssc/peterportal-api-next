import { load } from "cheerio";
import fetch from "cross-fetch";
import type { Element } from "cheerio";
import winston from "winston";

const LIB_SPACE_URL = "https://spaces.lib.uci.edu/spaces"

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
}

type StudyLocationIdMapping = {
    [id: string]: string;
}



async function getStudyLocationIds(): Promise<StudyLocationIdMapping> {
    const studyLocationIds: StudyLocationIdMapping = {};
    const response = await (await fetch(LIB_SPACE_URL)).text();
    const $ = load(response);
    $("#lid option").each(function (this: Element) {
        const locationId  = $(this).attr("value");
        const locationName = $(this).text().trim();
        // Ignore last option
        if (locationId && locationId !== "0") {
            studyLocationIds[locationId] = locationName;
        }
    });
    console.log(studyLocationIds)
    return studyLocationIds;
}

// TODO: Get room id Mappings

await getStudyLocationIds();