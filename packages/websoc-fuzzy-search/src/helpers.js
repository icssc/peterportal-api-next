import index from "../output/index.js";

import { types, fieldNames, courseFieldNames, instructorFieldNames } from "./constants.js";
import { matchCourseNum, tokenizeCourseNum } from "./regex.js";

// comparation function for sorting responses
function compare(a, b) {
  // compare object types in the order GE->department->course->instructor
  let aType = index.objects[a][0];
  let bType = index.objects[b][0];
  if (aType !== bType) return Math.sign(types[bType] - types[aType]);
  // special ordering for course numbers that checks in the order department->numeral->prefix->suffix
  if (aType === "COURSE") {
    const aDept = index.objects[a][2][0];
    const bDept = index.objects[b][2][0];
    if (aDept === bDept) {
      const [aPre, aNum, aSuf] = Object.values(
        index.objects[a][2][1].match(tokenizeCourseNum).groups,
      );
      const [bPre, bNum, bSuf] = Object.values(
        index.objects[b][2][1].match(tokenizeCourseNum).groups,
      );
      if (aNum === bNum) {
        return aPre === bPre ? lexOrd(aSuf, bSuf) : lexOrd(aPre, bPre);
      }
      return lexOrd(parseInt(aNum), parseInt(bNum));
    }
    return lexOrd(aDept, bDept);
  }
  // standard lexicographical ordering for everything else
  return lexOrd(a, b);
}

// shorthand for the lexicographical ordering ternary
function lexOrd(a, b) {
  return a === b ? 0 : a < b ? -1 : 1;
}

// given an array of keys, return a mapping of those keys to their results in index.objects
export function expandResponse(response, numResults, resultTypes, filterOptions) {
  response = resultTypes
    ? response.filter((x) => resultTypes.includes(index.objects[x][0]))
    : response;
  if (filterOptions) {
    for (const [k, v] of Object.entries(filterOptions)) {
      if (!v.length) continue;
      response = response.filter(
        (x) => index.objects[x][2][k] && v.every((y) => index.objects[x][2][k].includes(y)),
      );
    }
  }
  return response
    .sort(compare)
    .slice(0, numResults)
    .reduce((obj, key) => {
      obj[key] = index.objects[key].reduce((prev, curr, index) => {
        prev[fieldNames[index]] = curr;
        return prev;
      }, {});
      if (obj[key].type === "COURSE" || obj[key].type === "INSTRUCTOR") {
        obj[key].metadata = obj[key].metadata.reduce((prev, curr, index) => {
          prev[(obj[key].type === "COURSE" ? courseFieldNames : instructorFieldNames)[index]] =
            curr;
          return prev;
        }, {});
      }
      return obj;
    }, {});
}

// search on a single course number, with or without department
export function searchCourseNumber(courseNum) {
  let response = [];
  const matchGroups = courseNum.match(matchCourseNum).groups;
  // next check if a department was matched
  if (matchGroups.department) {
    for (const [alias, department] of Object.entries(index.aliases)) {
      for (const dept of department) {
        courseNum = courseNum.replace(
          new RegExp(`^${alias}(?=[bcdehmnps]?\\d{1,3}[a-z]{0,4})`),
          dept.toString(),
        );
      }
    }
    response.push(
      ...Object.keys(index.objects).filter((x) =>
        x.includes(courseNum.replace(" ", "").toUpperCase()),
      ),
    );
    // if not then we're dealing with a bare course number without the department
  } else {
    response.push(
      ...Object.keys(index.objects).filter(
        (x) =>
          index.objects[x][0] === "COURSE" &&
          index.objects[x][2][1].includes(matchGroups.number.toUpperCase()),
      ),
    );
  }
  return [...new Set(response)];
}

// search on a single GE category
export function searchGECategory(geCategory) {
  return [
    geCategory,
    ...Object.keys(index.objects).filter(
      (x) =>
        index.objects[x][2] &&
        index.objects[x][2][2] &&
        index.objects[x][2][2].includes(geCategory),
    ),
  ];
}

// search on a single keyword
export function searchKeyword(keyword, numResults) {
  keyword = keyword.toLowerCase();
  let response = [];
  // match all keywords
  const keyArrMap = Object.keys(index.keywords)
    .filter((x) => x.includes(keyword))
    .sort((a, b) => (a.length === b.length ? lexOrd(a, b) : lexOrd(a.length, b.length)))
    .reduce((obj, val) => {
      obj[val] = index.keywords[val];
      return obj;
    }, {});
  // prioritize exact keyword matches
  let exactDeptMatch = false;
  for (const kw of Object.keys(keyArrMap)) {
    if (kw === keyword) {
      response.push(...keyArrMap[kw]);
      for (const key of keyArrMap[kw]) {
        // prioritize exact department matches
        if (
          index.objects[key][0] === "DEPARTMENT" &&
          (keyword.toUpperCase() === key ||
            (index.aliases[keyword] && index.aliases[keyword].includes(key)))
        ) {
          response.push(
            ...Object.keys(index.objects).filter(
              (x) => index.objects[x][2] && index.objects[x][2][0] === key,
            ),
          );
          exactDeptMatch = true;
        }
      }
      delete keyArrMap[kw];
      break;
    }
  }
  // add everything else if no exact department match was found
  if (!exactDeptMatch) response.push(...Object.values(keyArrMap).flat());
  // if there are bare departments and not enough responses, add the courses from that department
  for (const key of response) {
    if (index.objects[key][0] === "DEPARTMENT" && response.length <= numResults) {
      response.push(
        ...Object.keys(index.objects).filter(
          (x) => index.objects[x][2] && index.objects[x][2][0] === key,
        ),
      );
    }
  }
  return [...new Set(response)];
}
