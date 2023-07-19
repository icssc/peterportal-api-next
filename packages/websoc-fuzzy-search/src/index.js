import { romans } from "./constants.js";
import { expandResponse, searchCourseNumber, searchGECategory, searchKeyword } from "./helpers.js";
import { matchCourseNum, matchGECategory } from "./regex.js";

// perform a search
export default function search(params) {
  let { query, numResults, resultType, filterOptions } = params ? params : {};
  query = query ? query.toLowerCase() : "";
  numResults = numResults ? numResults : Number.MAX_SAFE_INTEGER;
  // try matching GE categories first
  if (query.match(matchGECategory).groups.number) {
    const geCategories = query
      .split(",")
      .map((x) => x.replace(" ", "").replace(matchGECategory, `ge-$<number>$<suffix>`))
      .filter((x) => x);
    for (const i in geCategories) {
      const num = geCategories[i].match(matchGECategory).groups.number;
      geCategories[i] = geCategories[i].replace(num, romans[num] ? romans[num] : num).toUpperCase();
    }
    if (geCategories.length === 1) {
      // check whether the GE category actually exists; if only one entry was found, then it is invalid, because
      // searchGECategory() returns all classes that fulfill that category in addition to the category itself
      const response = searchGECategory(geCategories[0]);
      if (response.length !== 1)
        return expandResponse(response, numResults, resultType, filterOptions);
    } else {
      return expandResponse(
        [...new Set(geCategories.map((x) => searchGECategory(x)).flat())],
        numResults,
        resultType,
        filterOptions,
      );
    }
  }
  // if at least one course number-like object (CNLO) was matched, search only for course numbers
  // match with the regex without space first since matches on all course numbers
  if (query.match(matchCourseNum)) {
    const courseNums = query
      .split(",")
      .map((x) => x.replaceAll(" ", ""))
      .filter((x) => x);
    // if only one CNLO was matched, just run a single query
    if (courseNums.length === 1) {
      return expandResponse(
        searchCourseNumber(courseNums[0]),
        numResults,
        resultType,
        filterOptions,
      );
    }
    // for every CNLO matched, make sure it is a fully-qualified course number (FQCN);
    // that is, one that has a department or department alias and a number
    // (cs161 is a FQCN, while the numeral 161 is not)
    // if a bare numeral is found, assume that the last department or department alias applies
    // to that numeral, and then normalized
    // if all numbers given are bare numerals, then perform no normalization
    let lastDept = courseNums[0].match(matchCourseNum).groups.department;
    for (const i in courseNums) {
      const currDept = courseNums[i].match(matchCourseNum).groups.department;
      if (!currDept) {
        courseNums[i] = courseNums[i].replace(matchCourseNum, `${lastDept}$<number>`);
      } else if (currDept !== lastDept) {
        lastDept = currDept;
      }
    }
    return expandResponse(
      [...new Set(courseNums.map((courseNum) => searchCourseNumber(courseNum)).flat())],
      numResults,
      resultType,
      filterOptions,
    );
  }
  const keywords = query.split(" ");
  // if only one keyword was given, just run a single query
  if (keywords.length === 1) {
    return expandResponse(
      searchKeyword(keywords[0], numResults),
      numResults,
      resultType,
      filterOptions,
    );
  }
  // take the results of all queries and return their intersection
  return expandResponse(
    keywords
      .map((keyword) => searchKeyword(keyword, numResults))
      .reduce((array, response) => array.filter((x) => response.includes(x))),
    numResults,
    resultType,
    filterOptions,
  );
}
