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
