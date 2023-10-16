import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { normalize } from "node:path";
import { gzipSync } from "node:zlib";

import { isErrorResponse } from "@peterportal-api/types";
import type { Course, Instructor, RawResponse } from "@peterportal-api/types";
import fetch from "cross-fetch";
import pluralize from "pluralize";

// data sources
const aliases = JSON.parse(readFileSync("./input/aliases.json", { encoding: "utf8" }));
const departments = JSON.parse(readFileSync("./input/departments.json", { encoding: "utf8" }));
const geCategories = JSON.parse(readFileSync("./input/ge-categories.json", { encoding: "utf8" }));
const schools = JSON.parse(readFileSync("./input/schools.json", { encoding: "utf8" }));

// output configuration
const outputDir = normalize("./output/");
const outputFile = normalize(`${outputDir}index.ts`);

// Roman numeral map
// Stops at 8 because that's the highest Roman numeral encountered in the cache (as of 2022-04-08)
const romans: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
};

// words to filter out
const toFilter = ["", "a", "o", "an", "at", "in", "it", "of", "on", "to", "and", "for", "the"];

// types
type DataObject = {
  courses: Record<
    string,
    {
      department: string;
      department_name: string;
      number: string;
      ge_list: string[];
      course_level: string;
      school: string;
      title: string;
    }
  >;
  instructors: Record<
    string,
    {
      ucinetid: string;
      shortened_name: string;
      name: string;
      schools: string[];
      department: string;
    }
  >;
};

// convert titles to keywords
function keywordize(s: string) {
  return s
    .toLowerCase()
    .replace(/u\.s\./g, "us")
    .replace(/[&'(),\-/:]/g, " ")
    .split(" ")
    .map((x) => (Object.keys(romans).includes(x) ? [x, romans[x]] : x))
    .flat()
    .map((x) => (x === "us" || x === "we" ? x : pluralize(x, 1)))
    .filter((x) => !toFilter.includes(x));
}

// convert GE categories to keywords
function keywordizeGE(s: string) {
  s = s.toLowerCase();
  const r = Object.keys(romans).filter((x) => s.includes(romans[x]))[0];
  return [
    s,
    s.replace("-", ""),
    s.replace(romans[r], r),
    s.replace("-", "").replace(romans[r], r),
    s.slice(3).replace(romans[r], r),
  ];
}

// convert proper names to lowercase and filter out middle initials
function keywordizeName(s: string) {
  const delimiters = ["-", " ", ""];
  return [
    ...new Set(
      [s, s, s]
        .map((x, i) =>
          x
            .toLowerCase()
            .replace("-", delimiters[i])
            .split(" ")
            .filter((name) => name.length > 1 && !name.includes(".")),
        )
        .flat(),
    ),
  ];
}

// add object to set if keyword exists, create new set if not
function associate(d: Record<string, Set<unknown>>, k: string, o: string) {
  Object.keys(d).includes(k) ? d[k].add(o) : (d[k] = new Set([o]));
}

// parse the data into the format we want, and write it to the output
function parseAndWriteData(d: DataObject) {
  console.time("Index built in");
  console.log("Parsing data...");

  // GE categories
  const parsedData: {
    aliases: Record<string, Set<string>>;
    keywords: Record<string, Set<string>>;
    objects: Record<string, unknown[]>;
  } = {
    aliases: {},
    keywords: {},
    objects: geCategories,
  };
  for (const [key, value] of Object.entries(parsedData.objects)) {
    parsedData.objects[key].unshift("GE_CATEGORY");
    for (const keyword of [
      keywordizeGE(key),
      keywordize(key),
      keywordize(value[0] as string),
    ].flat()) {
      associate(parsedData.keywords, keyword, key);
    }
  }

  // department aliases
  for (const [key, value] of Object.entries(aliases)) {
    for (const department of value as string) {
      associate(parsedData.aliases, key, department);
      associate(parsedData.keywords, key, department);
    }
  }

  // departments and courses
  for (const [key, value] of Object.entries(d.courses)) {
    if (!Object.keys(parsedData.objects).includes(value.department)) {
      parsedData.objects[value.department] = ["DEPARTMENT", value.department_name];
      for (const keyword of [
        value.department.toLowerCase(),
        keywordize(value.department_name),
      ].flat()) {
        associate(parsedData.keywords, keyword, value.department);
      }
    }
    parsedData.objects[key] = [
      "COURSE",
      value.title,
      [
        value.department,
        value.number,
        value.ge_list
          .map((x) =>
            Object.keys(parsedData.objects).filter(
              (y) =>
                parsedData.objects[y][0] === "GE_CATEGORY" &&
                x.replace("&", "and").includes(parsedData.objects[y][1] as string),
            ),
          )
          .flat(),
        value.course_level[0] === "L" ? 0 : value.course_level[0] === "U" ? 1 : 2,
        schools[value.school],
      ],
    ];
    for (const keyword of keywordize(value.title)) {
      associate(parsedData.keywords, keyword, key);
    }
  }

  // instructors
  for (const instructor of Object.values(d.instructors)) {
    parsedData.objects[instructor.shortened_name] = [
      "INSTRUCTOR",
      instructor.name,
      [
        instructor.ucinetid,
        instructor.schools.map((x) => schools[x]),
        departments[instructor.department],
      ],
    ];
    associate(parsedData.keywords, instructor.ucinetid, instructor.shortened_name);
    for (const keyword of keywordizeName(instructor.name)) {
      associate(parsedData.keywords, keyword, instructor.shortened_name);
    }
  }

  // write the index using a replacer for Sets
  console.log("Writing parsed data...");
  const data = JSON.stringify(parsedData, (_, v) => (v instanceof Set ? [...v] : v));
  if (!existsSync(normalize(outputDir))) mkdirSync(normalize(outputDir));
  writeFileSync(
    `${outputFile}`,
    ["-d", "--debug"].includes(process.argv[2])
      ? "export let index: any = " + data
      : 'import{decode as a}from"base64-arraybuffer";import{ungzip as' +
          ' b}from"pako";let c=new' +
          " TextDecoder;export" +
          ' let index=JSON.parse(c.decode(b(a("' +
          gzipSync(data).toString("base64") +
          '"))))',
  );
  console.log(`Wrote index to file ${outputFile}`);
  console.timeEnd("Index built in");
}

async function main() {
  const d: DataObject = { courses: {}, instructors: {} };
  console.log("Fetching data...");
  console.time("Data fetched in");
  const coursesRes = await fetch("https://api-next.peterportal.org/v1/rest/courses/all");
  const coursesJson: RawResponse<Course[]> = await coursesRes.json();
  if (isErrorResponse(coursesJson)) throw new Error("Could not fetch courses from API.");
  coursesJson.payload.forEach(
    ({ id, department, departmentName, courseNumber, geList, courseLevel, school, title }) => {
      d.courses[id] = {
        department,
        department_name: departmentName,
        number: courseNumber,
        ge_list: geList,
        course_level: courseLevel,
        school,
        title,
      };
    },
  );
  const instructorsRes = await fetch("https://api-next.peterportal.org/v1/rest/instructors/all");
  const instructorsJson: RawResponse<Instructor[]> = await instructorsRes.json();
  if (isErrorResponse(instructorsJson)) throw new Error("Could not fetch instructors from API.");
  instructorsJson.payload.forEach(({ ucinetid, shortenedName, name, schools, department }) => {
    d.instructors[ucinetid] = {
      ucinetid,
      shortened_name: shortenedName,
      name,
      schools: schools as [],
      department,
    };
  });
  console.timeEnd("Data fetched in");
  parseAndWriteData(d);
}

main().then();
