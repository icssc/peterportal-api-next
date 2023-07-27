import { Quarter } from "peterportal-api-next-types";

export const quarterToLarcSuffix = (quarter: Exclude<Quarter, "Summer10wk">): string => {
  switch (quarter) {
    case "Fall":
      return "92,1";
    case "Winter":
      return "03,1";
    case "Spring":
      return "14,1";
    case "Summer1":
      return "25,s1";
    case "Summer2":
      return "76,s2";
  }
};

export const fmtDays = (days: string): string =>
  days
    .replace("Mon", "M")
    .replace("Tue", "Tu")
    .replace("Wed", "W")
    .replace("Thu", "Th")
    .replace("Fri", "F")
    .replace("/", "");

export const fmtTime = (time: string): string =>
  time.replace(/ /g, "").replace("AM", "a").replace("PM", "p");

export const fmtBldg = (building: string): string => (building === "Online" ? "ON LINE" : building);
