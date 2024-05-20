import { TimeSlot, StudyLocation } from "@anteater-api/types";
import { studyLocations } from "libs/uc-irvine-lib/src/spaces";
import { getStudySpaces } from "libs/uc-irvine-lib/src/spaces";
import { studyRooms } from "virtual:studyRooms";

/**
 * Data structure of time slots returned by libs.spaces.
 */
type Slot = {
  start: string;
  end: string;
  itemId: number;
  checkSum: string;
  className: string;
};

/**
 *  Map time slots to a more readable format.
 */
export function parseTimeSlots(slots: Slot[]): { [id: string]: TimeSlot[] } {
  const timeSlots: { [id: string]: TimeSlot[] } = {};
  slots.forEach((slot) => {
    const roomId = slot.itemId.toString();
    const [date, start] = slot.start.split(" ");
    const [_, end] = slot.end.split(" ");
    const timeSlot: TimeSlot = {
      date,
      start,
      end,
      booked: !!slot.className && slot.className === "s-lc-eq-checkout",
    };
    timeSlots[roomId] ??= [];
    timeSlots[roomId].push(timeSlot);
  });
  return timeSlots;
}

/**
 *  Aggregate study rooms and their time slots into a StudyLocation object.
 */
export async function aggregateStudyRooms(
  locationId: string,
  start: string,
  end: string,
): Promise<StudyLocation> {
  const spaces = await getStudySpaces(studyLocations[locationId].lid, start, end);
  const timeSlotsMap = parseTimeSlots(spaces.slots);
  return {
    id: locationId,
    ...studyLocations[locationId],
    rooms: Object.entries(timeSlotsMap)
      .filter(([id, _]) => studyRooms[id] != null)
      .map(([id, timeSlots]) => {
        return { ...studyRooms[id], timeSlots };
      }),
  };
}
