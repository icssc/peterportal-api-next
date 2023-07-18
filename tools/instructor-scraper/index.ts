import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import cheerio from "cheerio";
import fetch from "cross-fetch";
import he from "he";
import pLimit from "p-limit";
import type { Instructor } from "peterportal-api-next-types";
import { stringSimilarity } from "string-similarity-js";
import winston from "winston";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATALOGUE_BASE_URL = "https://catalogue.uci.edu";
const URL_TO_ALL_SCHOOLS = "https://catalogue.uci.edu/schoolsandprograms/";
const URL_TO_DIRECTORY = "https://directory.uci.edu/";
const URL_TO_INSTRUCT_HISTORY = "https://www.reg.uci.edu/perl/InstructHist";

const YEAR_THRESHOLD = 9; // Number of years to look back when grabbing course history

type InstructorsData = {
  result: InstructorsInfo;
  log: InstructorsLog;
};

type InstructorsInfo = {
  [ucinetid: string]: Instructor;
};

type InstructorsLog = {
  [key: string]:
    | string[]
    | { [key: string]: string }
    | { [key: string]: { [key: string]: string[] } };
  faculty_links: { [faculty_link: string]: string }; // Mapping of faculty links to departments
  instructors_found: {
    [key: string]: { schools: string[]; related_departments: string[] };
  }; // Mapping of instructors to related schools and departments
  instructors_dir_found: string[]; // Instructors found in directory
  instructors_dir_not_found: string[]; // Instructors not found in directory
  instructors_dir_failed: string[]; // Instructors that failed request
  instructors_course_history_found: string[]; // Instructors whose course history were found
  instructors_course_history_not_found: string[]; // Instructors whose course history were not found
  instructors_course_history_failed: string[]; // Instructors whose course history failed request
};

/**
 * Logger object to log info, errors, and warnings
 */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${__dirname}/logs/${Date.now()}.log`,
    }),
  ],
});

/**
 * @param ms - Milliseconds to wait
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get information of all instructors listed in the UCI catalogue page.
 *
 * The speed of this scraper largely depends on concurrency_limit and year_threshold. UCI websites run on boomer servers and will
 * die with too many concurrent calls, so we bottleneck. If a request fails we retry up to the number of attempts.
 *
 * Recommended parameters:
 * concurrency_limit <= 100;  Going more than 100 will likely result in more failed requests
 * attempts <= 5;
 *
 * @param concurrency_limit - Number of concurrent calls at a time
 * @param attempts - Number of attempts to make a request if fail
 * @param year_threshold - Number of years to look back when scraping instructor's course history
 * @returns {InstructorsData} Object containing instructors info and stats regarding retrieval
 */
export async function getInstructors(
  concurrency_limit = 16,
  attempts = 5,
  year_threshold: number = YEAR_THRESHOLD,
): Promise<InstructorsData> {
  if (process.env["DEBUG"] && existsSync(join(__dirname, "instructors.json")))
    return JSON.parse(readFileSync(join(__dirname, "instructors.json"), { encoding: "utf8" }));
  const currentYear = new Date().getFullYear();
  logger.info(`Scraping instructor data from ${currentYear - year_threshold} to ${currentYear}`);
  const limit = pLimit(concurrency_limit);
  const startTime = new Date().getTime();
  const instructorsInfo: InstructorsInfo = {};
  const instructorsLog: InstructorsLog = {
    faculty_links: {},
    instructors_found: {},
    instructors_dir_found: [],
    instructors_dir_not_found: [],
    instructors_dir_failed: [],
    instructors_course_history_found: [],
    instructors_course_history_not_found: [],
    instructors_course_history_failed: [],
  };
  const facultyLinks = await getFacultyLinks(attempts);
  instructorsLog["faculty_links"] = facultyLinks;
  logger.info(`Retrieved ${Object.keys(facultyLinks).length} faculty links`);
  const instructorNamePromises = Object.keys(facultyLinks).map((link) =>
    getInstructorNames(link, attempts),
  );
  await sleep(1000); // Wait 1 second before scraping site again or catalogue.uci will throw a fit
  const facultyCoursesPromises = Object.keys(facultyLinks).map((link) =>
    getDepartmentCourses(link, attempts),
  );
  const instructorNames = await Promise.all(instructorNamePromises);
  const facultyCourses = await Promise.all(facultyCoursesPromises);
  // Build dictionary containing instructor_name and their associated schools/courses
  const instructorsDict: {
    [name: string]: { schools: string[]; courses: Set<string> };
  } = {};
  Object.keys(facultyLinks).forEach((link, i) => {
    instructorNames[i].forEach((name) => {
      if (!(name in instructorsDict)) {
        instructorsDict[name] = {
          schools: [facultyLinks[link]],
          courses: new Set(facultyCourses[i]),
        };
      }
      // Instructor referenced in multiple faculty pages
      else {
        instructorsDict[name].schools.push(facultyLinks[link]);
        facultyCourses[i].forEach(instructorsDict[name].courses.add, instructorsDict[name].courses);
      }
    });
  });
  const instructorPromises: Promise<[string, Instructor]>[] = [];
  Object.keys(instructorsDict).forEach((name) => {
    const schools = instructorsDict[name].schools;
    const related_departments = Array.from(instructorsDict[name].courses);
    // Append promise for each instructor - the number of promises that run at the same is determined by concurrency_limit
    instructorPromises.push(
      limit(() => getInstructor(name, schools, related_departments, attempts, year_threshold)),
    );
    instructorsLog["instructors_found"][name] = {
      schools: schools,
      related_departments: related_departments,
    };
  });
  logger.info(`Retrieved ${Object.keys(instructorsDict).length} instructor names`);
  const instructors = await Promise.all(instructorPromises);
  // Store results and log
  instructors.forEach((instructorResult) => {
    const name = instructorResult[1]["name"];
    const ucinetid = instructorResult[1]["ucinetid"];
    switch (instructorResult[0]) {
      case "FOUND": // Instructor found in both directory and course history
        instructorsLog["instructors_dir_found"].push(name);
        instructorsLog["instructors_course_history_found"].push(name);
        instructorsInfo[ucinetid] = instructorResult[1];
        break;
      case "NOT_FOUND": // Instructor not found in directory
        instructorsLog["instructors_dir_not_found"].push(name);
        break;
      case "FAILED": // Instructor cannot be requested from server
        instructorsLog["instructors_dir_failed"].push(name);
        break;
      case "HISTORY_NOT_FOUND": // Instructor not found in course history
        instructorsLog["instructors_dir_found"].push(name);
        instructorsLog["instructors_course_history_not_found"].push(name);
        instructorsInfo[ucinetid] = instructorResult[1];
        break;
      case "HISTORY_FAILED": // Instructor cannot be requested from server
        instructorsLog["instructors_dir_found"].push(name);
        instructorsLog["instructors_course_history_failed"].push(name);
        instructorsInfo[ucinetid] = instructorResult[1];
        break;
    }
  });
  const data = {
    result: instructorsInfo,
    log: instructorsLog,
  };
  logger.info(data);
  // Calculate time elapsed
  const endTime = new Date();
  const timeDiff = endTime.getTime() - startTime;
  const seconds = timeDiff / 1000;
  const minutes = seconds / 60;
  logger.info({
    time_elapsed: `${Math.floor(minutes)} min ${Math.floor(seconds % 60)} sec`,
  });
  return data;
}

/**
 * Retrieve information about an Instructor
 *
 * @param instructorName - Name of instructor
 * @param schools - Schools related to the instrcutor
 * @param relatedDepartments - Departments related to the instructor
 * @param attempts - Number of attempts to make a request if fail
 * @param year_threshold - number of years to look back when scraping instructor's course history
 * @returns {[string, Instructor]} Object containg the instructor's data
 */
async function getInstructor(
  instructorName: string,
  schools: string[],
  relatedDepartments: string[],
  attempts: number,
  year_threshold: number,
): Promise<[string, Instructor]> {
  const instructorObject: Instructor = {
    name: instructorName,
    ucinetid: "",
    title: "",
    department: "",
    email: "",
    schools: schools,
    relatedDepartments: relatedDepartments,
    shortenedName: "",
    courseHistory: {},
  };
  const [directory_status, directoryInfo] = await getDirectoryInfo(instructorName, attempts);
  let status = directory_status;
  if (status !== "FOUND") {
    return [status, instructorObject];
  }
  instructorObject["name"] = directoryInfo["name"];
  instructorObject["ucinetid"] = directoryInfo["ucinetid"];
  instructorObject["title"] = directoryInfo["title"];
  instructorObject["department"] = directoryInfo["department"];
  instructorObject["email"] = directoryInfo["email"];
  const courseHistory = await getCourseHistory(
    instructorObject["name"],
    relatedDepartments,
    attempts,
    year_threshold,
  );
  instructorObject["shortenedName"] = courseHistory[1]["shortened_name"];
  instructorObject["courseHistory"] = courseHistory[1]["course_history"];
  status = courseHistory[0];
  return [status, instructorObject];
}

/**
 * Traverse the school's department pages to retrieve its correpsonding faculty links.
 * 
 * @param schoolUrl - URL to scrape data from
 * @param schoolName - Name of the school
 * @param root - Boolean for if we are scraping main school page, determines if we should keep crawling
 * @param attempts - Number of times the function will be called again if request fails
 * @returns {object}: A map of the schoolName to an array of faculty links
 * Example:
 *      {'The Henry Samueli School of Engineering': [ 'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty',
      'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofchemicalandbiomolecularengineering/#faculty', ...]}
*/
async function getFaculty(
  schoolUrl: string,
  schoolName: string,
  root: boolean,
  attempts: number,
): Promise<{ [key: string]: string[] }> {
  const schoolURLs: { [faculty_link: string]: string[] } = {
    [schoolName]: [],
  };
  try {
    const response = await (await fetch(schoolUrl)).text();
    const $ = cheerio.load(response);
    // Faculty tab found
    if ($("#facultytab").length !== 0) {
      schoolURLs[schoolName].push(schoolUrl);
    }
    // No faculty tab, might have departments tab
    else if (root) {
      const departmentLinks: string[][] = [];
      $(".levelone li a").each(function (this: cheerio.Element) {
        const departmentURL = $(this).attr("href");
        departmentLinks.push([CATALOGUE_BASE_URL + departmentURL + "#faculty", schoolName]);
      });
      const departmentLinksPromises = departmentLinks.map((x) =>
        getFaculty(x[0], x[1], false, attempts - 1),
      );
      const departmentLinksResults = await Promise.all(departmentLinksPromises);
      departmentLinksResults.forEach((res) => {
        schoolURLs[schoolName] = schoolURLs[schoolName].concat(res[schoolName]);
      });
    }
  } catch (error) {
    if (attempts > 0) {
      await sleep(1000);
      return await getFaculty(schoolUrl, schoolName, false, attempts - 1);
    }
  }
  return schoolURLs;
}

/**
 * Return the faculty links and their corresponding school name
 *
 * @param attempts - Number of times the function will be called again if request fails
 * @returns {object} A map of all faculty links to their corresponding school
 * Example:
 *      {'http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty':'Claire Trevor School of the Arts',
 *      'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty':'The Henry Samueli School of Engineering', ...}
 */
async function getFacultyLinks(attempts: number): Promise<{ [faculty_link: string]: string }> {
  const result: { [faculty_link: string]: string } = {};
  try {
    // Get links to all schools and store them into an array
    const response = await (await fetch(URL_TO_ALL_SCHOOLS)).text();
    const $ = cheerio.load(response);
    const schoolLinks: string[][] = [];
    $("#textcontainer h4 a").each(function (this: cheerio.Element) {
      const schoolURL = $(this).attr("href");
      const schoolName = $(this).text();
      schoolLinks.push([CATALOGUE_BASE_URL + schoolURL + "#faculty", schoolName]);
    });
    // Asynchronously call getFaculty on each link
    const schoolLinksPromises = schoolLinks.map((x) => getFaculty(x[0], x[1], true, attempts));
    const schoolLinksResults = await Promise.all(schoolLinksPromises);
    schoolLinksResults.forEach((schoolURLs) => {
      for (const schoolName in schoolURLs) {
        schoolURLs[schoolName].forEach((url) => {
          result[url] = schoolName;
        });
      }
    });
  } catch (error) {
    if (attempts > 0) {
      await sleep(1000);
      return await getFacultyLinks(attempts - 1);
    }
  }
  return result;
}

/**
 * Return the names of instructors from a faculty page
 *
 * @param facultyLink - Link to faculty page
 * @param attempts - Number of times the function will be called again if request fails
 * @returns {string[]} A list of instructor names
 */
async function getInstructorNames(facultyLink: string, attempts: number): Promise<string[]> {
  const result: string[] = [];
  try {
    const response = await (await fetch(facultyLink)).text();
    const $ = cheerio.load(response);
    $(".faculty").each(function (this: cheerio.Element) {
      let name = he.decode($(this).find(".name").text()); // Get name and try decoding
      name = name.split(",")[0]; // Remove suffixes that begin with ","  ex: ", Jr."
      name = name.replace(/\s*\b(?:I{2,3}|IV|V|VI{0,3}|IX)\b$/, ""); // Remove roman numeral suffixes ex: "III"
      name = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // Remove Accents Diacritics
      result.push(name);
    });
  } catch (error) {
    if (attempts > 0) {
      await sleep(1000);
      return await getInstructorNames(facultyLink, attempts - 1);
    }
  }
  return result;
}

/**
 * Get courses related to a faculty page
 *
 * @param facultyLink - Link to faculty page
 * @param attempts - Number of times the function will be called again if request fails
 * @returns {string[]} A list of courses related to the department
 * Example:
 *      ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"] - http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty
 */
async function getDepartmentCourses(facultyLink: string, attempts: number): Promise<string[]> {
  const departmentCourses: string[] = [];
  try {
    const courseUrl = facultyLink.replace("#faculty", "#courseinventory");
    const response = await (await fetch(courseUrl)).text();
    const $ = cheerio.load(response);
    $("#courseinventorycontainer .courses").each(function (this: cheerio.Element) {
      if ($(this).find("h3").length == 0) {
        return;
      }
      const courseTitle = $(this).find(".courseblocktitle").text().trim().normalize("NFKD"); // I&C SCI 31. Introduction to Programming. 4 Units.
      const courseID = courseTitle.substring(0, courseTitle.indexOf(".")); // I&C SCI 31
      const course = courseID.substring(0, courseID.lastIndexOf(" ")); // I&C SCI
      departmentCourses.push(course);
    });
    // No courses can be found - check if hardcoded
    if (departmentCourses.length == 0) {
      return getHardcodedDepartmentCourses(facultyLink);
    }
  } catch (error) {
    if (attempts > 0) {
      await sleep(1000);
      return await getDepartmentCourses(facultyLink, attempts - 1);
    }
  }
  return departmentCourses;
}

/**
 * Some faculty pages don't have a corresponding course inventory page, so we hardcode them
 * Go to https://www.reg.uci.edu/perl/InstructHist to find courses of faculty
 *
 * @param facultyLink - Link to faculty page
 * @returns {string[]} A list of department courses related to the department
 */
function getHardcodedDepartmentCourses(facultyLink: string): string[] {
  const lookup: { [faculty_link: string]: string[] } = {
    "http://catalogue.uci.edu/schooloflaw/#faculty": ["LAW"],
    "http://catalogue.uci.edu/schoolofmedicine/#faculty": [],
  };
  if (facultyLink in lookup) {
    return lookup[facultyLink];
  }
  logger.warn(
    `WARNING! ${facultyLink} does not have an associated Courses page! Use https://www.reg.uci.edu/perl/InstructHist to hardcode.`,
  );
  return [];
}

/**
 * Get the instructor's directory info.
 * 
 * @param instructorName - Name of instructor (replace "." with " ")
 * @param attempts - Number of times the function will be called again if request fails
 * @returns {object} Dictionary of instructor's info
 * Example:
 *      {
            "name": "Alexander W Thornton",
            "ucinetid": "thornton", 
            "title": "Continuing Lecturer",
            "email": "thornton@uci.edu"
        }
 */
async function getDirectoryInfo(
  instructorName: string,
  attempts: number,
): Promise<[string, { [key: string]: string }]> {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const name = instructorName.replace(/\./g, ""); // remove '.' from name
  const data = new URLSearchParams({
    uciKey: name,
    filter: "all", // "all" instead of "staff" bc some instructors are not "staff" (?)
  });
  try {
    // Try multiple attempts to get results bc the directory is so inconsistent
    // Search with base name
    let response = await fetch(URL_TO_DIRECTORY, {
      method: "POST",
      headers: headers,
      body: data,
    }).then((res) => res.json());
    // Try stripping '-' from name
    if (Object.keys(response).length === 0 && name.includes("-")) {
      data.set("uciKey", name.replace(/-/g, ""));
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    // Try prepending all single characters to the next word "Alexander W Thornton" -> "Alexander WThornton"
    if (Object.keys(response).length === 0 && /(\b\w)\s(\w+)/g.test(name)) {
      data.set("uciKey", name.replace(/(\b\w)\s(\w+)/g, "$1$2"));
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    const nameSplit = name.split(" ");
    // Try parts surrounding middle initial
    if (Object.keys(response).length === 0 && nameSplit.length > 2 && nameSplit[1].length === 1) {
      data.set("uciKey", nameSplit[0] + " " + nameSplit[2]);
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    // Try first and last part of name
    if (Object.keys(response).length === 0) {
      data.set("uciKey", nameSplit[0] + " " + nameSplit[nameSplit.length - 1]);
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    // Try first and last part of name but shorter first name
    if (Object.keys(response).length === 0 && nameSplit[0].length > 7) {
      data.set("uciKey", nameSplit[0].slice(0, 5) + " " + nameSplit[nameSplit.length - 1]);
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    // Try name without last part
    if (Object.keys(response).length == 0 && nameSplit.length > 2 && nameSplit[1].length > 1) {
      data.set("uciKey", nameSplit.slice(0, -1).join(" "));
      response = await fetch(URL_TO_DIRECTORY, {
        method: "POST",
        headers: headers,
        body: data,
      }).then((res) => res.json());
    }
    let json;
    // 1 result found, likely hit
    if (Object.keys(response).length == 1) {
      json = response[0][1];
    }
    // Multiple results, need to find best match
    else if (Object.keys(response).length > 1) {
      // Retrieve names with the highest match score
      const nameResults = [strToTitleCase(response[0][1]["Name"])];
      for (let i = 1; i < Object.keys(response).length; i++) {
        if (response[i][0] == response[0][0]) {
          nameResults.push(strToTitleCase(response[i][1]["Name"]));
        }
      }
      const ratings = nameResults.map((target) => ({
        target,
        rating: stringSimilarity(name, target, 1),
      }));
      const bestMatchIndex = ratings
        .map((x) => x.rating)
        .indexOf(Math.max(...ratings.map((x) => x.rating), 0));
      const match = {
        ratings,
        bestMatch: ratings[bestMatchIndex],
        bestMatchIndex,
      };
      if (match["bestMatch"]["rating"] >= 0.5) {
        json = response[match["bestMatchIndex"]][1];
      }
      // Check if Nickname matches
      else if (stringSimilarity(name, response[match["bestMatchIndex"]][1]["Nickname"], 1) >= 0.5) {
        json = response[match["bestMatchIndex"]][1];
      }
    }
    if (json) {
      return [
        "FOUND",
        {
          // he.decode() to decode HTML encoded char
          name: he.decode(strToTitleCase(json.Name)), // For some reason returned names can be capitalized like bruh ("MILENA MIHAIL")
          ucinetid: json.UCInetID,
          title: he.decode(json.Title),
          department: he.decode(json.Department),
          email: Buffer.from(json.Email, "base64").toString("utf8"), // decode Base64 email
        },
      ];
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.name);
      logger.error(error.message);
      logger.error(error.stack);
    }
    if (attempts > 0) {
      await sleep(1000);
      return await getDirectoryInfo(name, attempts - 1);
    }
    logger.error(
      "Failed to access directory! You may be making too many requests. Try lowering the concurrent limit.",
    );
    return ["FAILED", {}];
  }
  // No match found
  return ["NOT_FOUND", {}];
}

/**
 * Convert string to title case.
 *
 * @param str - String
 * @returns {string} String in title case
 */
function strToTitleCase(str: string): string {
  const strArray = str.toLocaleLowerCase().split(" ");
  return strArray.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/**
 * Get the professor's course history by searching them on websoc.
 *
 * @param instructorName - Name of instructor
 * @param relatedDepartments - A list of departments related to the instructor
 * @param attempts - Number of times a page will be requested if fail
 * @param year_threshold - Number of years to look back when scraping instructor's course history
 * @returns {object} A dictionary containing the instructor's "shortened_name" and "course_history"
 */
async function getCourseHistory(
  instructorName: string,
  relatedDepartments: string[],
  attempts: number,
  year_threshold: number,
): Promise<
  [
    string,
    {
      shortened_name: string;
      course_history: {
        [course_id: string]: string[];
      };
    },
  ]
> {
  const courseHistory: { [key: string]: Set<string> } = {};
  const nameCounts: { [key: string]: number } = {};
  let page: string;
  let continueParsing: boolean;
  let status = "";
  const name = instructorName.replace(/\./g, "").split(" "); // Remove '.' and split => ['Alexander W Thornton']
  let shortenedName = `${name[name.length - 1]}, ${name[0][0]}.`; // Join last name and first initial           => 'Thornton, A.'
  const params = {
    order: "term",
    action: "Submit",
    input_name: shortenedName,
    term_yyyyst: "ANY",
    start_row: "",
  };
  try {
    // Parse first page
    page = await fetchHistoryPage(params, attempts);
    if (page === "HISTORY_FAILED") {
      throw new Error(page);
    } else if (page === "HISTORY_NOT_FOUND") {
      throw new Error(page);
    }
    continueParsing = await parseHistoryPage(
      page,
      year_threshold,
      relatedDepartments,
      courseHistory,
      nameCounts,
    );
    // Set up parameters to parse previous pages (older course pages)
    let row = 1;
    params["action"] = "Prev";
    params["start_row"] = row.toString();
    while (continueParsing) {
      page = await fetchHistoryPage(params, attempts);
      if (page === "HISTORY_FAILED") {
        throw new Error(page);
      } else if (page === "HISTORY_NOT_FOUND") {
        throw new Error(page);
      }
      continueParsing = await parseHistoryPage(
        page,
        year_threshold,
        relatedDepartments,
        courseHistory,
        nameCounts,
      );
      row += 101;
      params["start_row"] = row.toString();
    }
    status = "FOUND";
    // Determine most common shortened name
    if (Object.keys(nameCounts).length > 0) {
      shortenedName = Object.keys(nameCounts).reduce((a, b) =>
        nameCounts[a] > nameCounts[b] ? a : b,
      ); // Get name with the greatest count
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      status = error.message;
    }
  }
  // Convert sets to lists
  const courseHistoryListed: { [key: string]: string[] } = {};
  for (const courseId in courseHistory) {
    courseHistoryListed[courseId.replace(/ {2}/g, " ")] = Array.from(courseHistory[courseId]);
  }
  if (status == "FOUND" && Object.keys(courseHistoryListed).length == 0) {
    status = "HISTORY_NOT_FOUND";
  }
  return [
    status,
    {
      shortened_name: shortenedName,
      course_history: courseHistoryListed,
    },
  ];
}

/**
 * Get a page from the InstructHist website
 *
 * @param params - query parameters for the get request
 * @param attempts - Number of times the page will be requested if fail
 * @returns
 */
async function fetchHistoryPage(
  params: { [key: string]: string },
  attempts: number,
): Promise<string> {
  try {
    const response = await (
      await fetch(URL_TO_INSTRUCT_HISTORY + "?" + new URLSearchParams(params))
    ).text();
    const $ = cheerio.load(response);
    const warning = $("tr td.lcRegWeb_red_message");
    if (warning.length) {
      if (
        warning.text().startsWith("No results found") ||
        warning.text().startsWith("Too many result")
      ) {
        return "HISTORY_NOT_FOUND";
      } else if (warning.text().trim().endsWith("connection to database is down.")) {
        throw new Error("HISTORY_FAILED"); // This means database ded
      }
    }
    return response;
  } catch (error) {
    if (attempts > 0) {
      await sleep(1000);
      return await fetchHistoryPage(params, attempts - 1);
    }
  }
  logger.error(
    "InstrucHist connection to database is down! You may be making too many requests. Try lowering the concurrent limit.",
  );
  return "HISTORY_FAILED";
}

/**
 * Parse the instructor history page and returns true if entries are valid. This is used to determine
 * whether we want to continue parsing as there may be more pages of entries.
 *
 * @param instructorHistoryPage - HTML string of an instructor history page
 * @param year_threshold - number of years to look back when scraping instructor's course history
 * @param relatedDepartments - a list of departments related to the instructor
 * @param courseHistory - a dictionary of courses where the values are a list of terms in which the course was taught
 * @param nameCounts - a dictionary of instructor names storing the number of name occurrences found in entries (used to determine the 'official' shortened name - bc older record names may differ from current) ex: Thornton A.W. = Thornton A.
 * @returns {boolean} - true if entries are found, false if not
 */
async function parseHistoryPage(
  instructorHistoryPage: string,
  year_threshold: number,
  relatedDepartments: string[],
  courseHistory: { [key: string]: Set<string> },
  nameCounts: { [key: string]: number },
): Promise<boolean> {
  const relatedDepartmentsSet = new Set(relatedDepartments);
  // Map of table fields to index
  const fieldLabels = {
    qtr: 0,
    empty: 1,
    instructor: 2,
    courseCode: 3,
    dept: 4,
    courseNo: 5,
    type: 6,
    title: 7,
    units: 8,
    maxCap: 9,
    enr: 10,
    req: 11,
  };
  const currentYear = new Date().getFullYear() % 100;
  let entryFound = false;
  try {
    const $ = cheerio.load(instructorHistoryPage);
    $("table tbody tr").each(function (this: cheerio.Element) {
      const entry = $(this).find("td");
      // Check if row entry is valid
      if ($(entry).length == 12) {
        const qtrValue = $(entry[fieldLabels["qtr"]]).text().trim();
        if (qtrValue.length < 4 && qtrValue != "Qtr") {
          entryFound = true;
          const qtrYear = parseInt(qtrValue.replace(/\D/g, ""));
          // Stop parsing if year is older than threshold
          if (currentYear - qtrYear > year_threshold) {
            entryFound = false;
            return false;
          }
          // Get name(s) in the instructor field
          $(entry[fieldLabels["instructor"]])
            .html()
            ?.trim()
            ?.split("<br>")
            .forEach((name) => {
              nameCounts[name] = nameCounts[name] ? nameCounts[name] + 1 : 1; // Increment name in nameCounts
            });
          // Get course id if dept is related
          const deptValue = $(entry[fieldLabels["dept"]]).text().trim();
          if (relatedDepartmentsSet.has(deptValue)) {
            const courseId = `${deptValue} ${$(entry[fieldLabels["courseNo"]]).text().trim()}`;
            if (courseId in courseHistory) {
              courseHistory[courseId].add(qtrValue);
            } else {
              courseHistory[courseId] = new Set([qtrValue]);
            }
          }
        }
      }
      return true; // Continue looping
    });
    // Last page of course history
    if ($('a:contains("Prev")').length === 0) {
      entryFound = false;
      return false;
    }
  } catch (error) {
    logger.error(error);
  }
  return entryFound;
}

async function main() {
  const instructors = await getInstructors();
  writeFileSync("./instructors.json", JSON.stringify(instructors));
}

main();
