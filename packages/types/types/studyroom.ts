/**
 * An object representing a Study Room.
 */
export type StudyRoom = {
  /**
   * ID of study room used by spaces.lib.
   */
  id: string;
  /**
   * Name of the study room and its room number.
   */
  name: string;
  /**
   * Number of chairs in the study room.
   */
  capacity: number;
  /**
   * Name of study location.
   */
  location: string;
  /**
   * Description of the study room.
   */
  description?: string;
  /**
   * Directions to the study room.
   */
  directions?: string;
  /**
   * Time slots for the study room.
   */
  timeSlots?: TimeSlot[];
  /**
   * If the study room has TV or other tech enhancements.
   */
  techEnhanced?: boolean;
};

/**
 * An object representing a time slot and avaliability for a study room.
 */
export type TimeSlot = {
  /**
   * Start time of the time slot.
   */
  start: string;
  /**
   * End time of the time slot.
   */
  end: string;
  /**
   * If the time slot is available.
   */
  available: boolean;
};

/**
 * An object representing a study location.
 */
export type StudyLocation = {
  /**
   * ID of the study location used by space.lib.
   */
  id: string;
  /**
   * Name of the study location.
   */
  name: string;
  /**
   * Rooms in the study location.
   */
  rooms: StudyRoom[];
};
