// regex to match GE category
export const matchGECategory =
  /(?<ge>(?:ge)?)(?<hyphen>-?)(?<number>[1-8]|(?:iv|v?i{0,3}))(?<suffix>[ab]?)/;

// regex to match department and/or course number without space
export const matchCourseNum =
  /(?<department>([ &/a-z]{1,2}4?[ &/a-z]*)?)(?<number>[a-z]?\d{1,3}[a-z]{0,4})/;

// regex to tokenize a course number into its prefix/numeral/suffix
export const tokenizeCourseNum = /(?<prefix>[A-Z]?)(?<numeral>\d{1,3})(?<suffix>[A-Z]{0,4})/;
