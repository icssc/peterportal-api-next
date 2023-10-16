// mapping of types to numbers for compare
export const types: Record<string, number> = {
  GE_CATEGORY: 4,
  DEPARTMENT: 3,
  COURSE: 2,
  INSTRUCTOR: 1,
};

// Roman numeral map
// Stops at 8 because that's the highest Roman numeral encountered in the cache (as of 2022-04-08)
export const romans: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
};

// field names
export const fieldNames = ["type", "name", "metadata"];
export const courseFieldNames = ["department", "number", "geList", "courseLevel", "school"];
export const instructorFieldNames = ["ucinetid", "school", "department"];
