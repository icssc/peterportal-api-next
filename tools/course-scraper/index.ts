import cheerio from "cheerio";
import fetch from "cross-fetch";
import fs, { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// scrape links
const CATALOGUE_BASE_URL = "https://catalogue.uci.edu";
const URL_TO_ALL_COURSES: string = CATALOGUE_BASE_URL + "/allcourses/";
const URL_TO_ALL_SCHOOLS: string = CATALOGUE_BASE_URL + "/schoolsandprograms/";

// output file names
const COURSES_DATA_NAME = "course_data.json";

// references
const GE_DICTIONARY: Record<string, string> = {
  Ia: "GE Ia: Lower Division Writing",
  Ib: "GE Ib: Upper Division Writing",
  II: "GE II: Science and Technology",
  III: "GE III: Social & Behavioral Sciences",
  IV: "GE IV: Arts and Humanities",
  Va: "GE Va: Quantitative Literacy",
  Vb: "GE Vb: Formal Reasoning",
  VI: "GE VI: Language Other Than English",
  VII: "GE VII: Multicultural Studies",
  VIII: "GE VIII: International/Global Issues",
};

/**
 * @param ms milliseconds to sleep for
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} s: string to normalize (usually parsed from cheerio object)
 * @returns {string}: a normalized string that can be safely compared to other strings
 */
export function normalizeString(s: string): string {
  return s.normalize("NFKD");
}

/**
 * @returns {Promise<{ [key: string]: string }>}: a mapping from department code to school name. Uses the catalogue.
 * Example: {"I&C SCI":"Donald Bren School of Information and Computer Sciences","IN4MATX":"Donald Bren School of Information and Computer Sciences"}
 */
export async function getDepartmentToSchoolMapping(): Promise<{ [key: string]: string }> {
  /**
   * helper function that takes a URL to a department page and maps the course page to each school on that page
   * @param {string} departmentUrl: URL to a department page
   * @param {string} school: school name
   */
  async function findSchoolNameFromDepartmentPage(departmentUrl: string, school: string) {
    const response = await fetch(departmentUrl);
    const $ = cheerio.load(await response.text());
    // if this department has the "Courses" tab
    const departmentCourses = $("#courseinventorytab");
    if (departmentCourses.text() != "") {
      // map school cheerio
      await mapCoursePageToSchool(mapping, school, departmentUrl);
    }
  }

  /**
   * helper function that takes a URL to a school page and maps the course page to each school on that page
   * also checks for department links on the school page, and calls findSchoolNameFromDepartmentPage on each of them
   * @param {string} schoolURL: URL to a school page
   */
  async function findSchoolName(schoolURL: string) {
    const response = await fetch(schoolURL);
    const $ = cheerio.load(await response.text());
    // get school name
    const school: string = normalizeString($("#contentarea > h1").text());
    if (debug) {
      console.log("School: " + school);
    }
    // if this school has the "Courses" tab
    const schoolCourses = $("#courseinventorytab");
    if (schoolCourses.text() != "") {
      // map school cheerio
      await mapCoursePageToSchool(mapping, school, schoolURL);
    }
    // look for department links
    const departmentLinks = $(".levelone");
    const departmentURLList: string[] = [];
    if ($(departmentLinks).text() != "") {
      // go through each department link
      $(departmentLinks)
        .find("li")
        .each((j, departmentLink) => {
          // create department cheerio
          const departmentUrl: string =
            CATALOGUE_BASE_URL + $(departmentLink).find("a").attr("href") + "#courseinventory";
          departmentURLList.push(departmentUrl);
        });
      const departmentLinksPromises: Promise<void>[] = departmentURLList.map((x) =>
        findSchoolNameFromDepartmentPage(x, school)
      );
      const departmentLinksResult = await Promise.all(departmentLinksPromises);
    }
  }

  console.log("Mapping Departments to Schools...");
  // some need to be hard coded (These are mentioned in All Courses but not listed in their respective school catalogue)
  const mapping: Record<string, string> = JSON.parse(
    readFileSync("./missingDepartments.json", { encoding: "utf8" })
  );
  const response = await fetch(URL_TO_ALL_SCHOOLS);
  const $ = cheerio.load(await response.text());
  const schoolLinks: string[] = [];
  // look through all the lis in the sidebar
  $("#textcontainer > h4").each((i, lis) => {
    // create new cheerio object based on each school
    const schoolURL: string =
      CATALOGUE_BASE_URL + $(lis).find("a").attr("href") + "#courseinventory";
    schoolLinks.push(schoolURL);
  });
  const schoolLinksPromises: Promise<void>[] = schoolLinks.map((x) => findSchoolName(x));
  const schoolLinksResult = await Promise.all(schoolLinksPromises);
  console.log("Successfully mapped " + Object.keys(mapping).length + " departments!");
  return mapping;
}

/**
 * @param {object} mapping: the object used to map department code to school name
 * @param {string} school: the school to map to
 * @param {string} courseURL: URL to a Courses page
 * @returns {void}: nothing, mutates the mapping passed in
 */
export async function mapCoursePageToSchool(
  mapping: { [key: string]: string },
  school: string,
  courseURL: string
) {
  const response = await fetch(courseURL);
  const $ = cheerio.load(await response.text());
  // get all the departments under this school
  const courseBlocks: cheerio.Element[] = [];
  $("#courseinventorycontainer > .courses").each(async (i, schoolDepartment: cheerio.Element) => {
    // if department is not empty (why tf is Chemical Engr and Materials Science empty)
    const department: string = $(schoolDepartment).find("h3").text();
    if (department != "") {
      // extract the first department code
      courseBlocks.push($(schoolDepartment).find("div")[0]);
    }
  });
  const courseBlockPromises: Promise<string[]>[] = courseBlocks.map((x) =>
    getCourseInfo(x, courseURL)
  );
  const courseBlockResults: string[][] = await Promise.all(courseBlockPromises);
  courseBlockResults.forEach((courseInfo: string[]) => {
    // get the course ID from the returned array from getCourseInfo
    const courseID: string = courseInfo[0];
    const id_dept: string = courseID.split(" ").slice(0, -1).join(" ");
    // set the mapping
    if (debug) {
      console.log(`\t${id_dept}`);
    }
    mapping[id_dept] = school;
  });
}

/**
 * @returns {Promise<string[]>}: a list of class URLS from AllCourses
 * Example: ["http://catalogue.uci.edu/allcourses/ac_eng/","http://catalogue.uci.edu/allcourses/afam/",...]
 */
export async function getAllCourseURLS(): Promise<string[]> {
  console.log("Collecting Course URLs from {" + URL_TO_ALL_COURSES + "}...");
  // store all URLS in list
  const courseURLS: string[] = [];
  // access the course website to parse info
  const response = await fetch(URL_TO_ALL_COURSES);
  const $ = cheerio.load(await response.text());
  // get all the unordered lists
  $("#atozindex > ul").each((i, letterLists) => {
    // get all the list items
    $(letterLists)
      .find("li")
      .each((j, letterList) => {
        // prepend base url to relative path
        courseURLS.push(CATALOGUE_BASE_URL + $(letterList).find("a").attr("href"));
      });
  });
  console.log("Successfully found " + courseURLS.length + " course URLs!");
  return courseURLS;
}

/**
 * @param {string} courseURL: URL to a Courses page
 * @param {{ [key: string]: Object }} json_data: maps class to its json data ({STATS 280: {metadata: {...}, data: {...}, node: Node}})
 * @param {{ [key: string]: string }} departmentToSchoolMapping: maps department code to its school {I&C SCI: Donald Bren School of Information and Computer Sciences}
 * @returns {void}: nothing, mutates the json_data passed in
 */
export async function getAllCourses(
  courseURL: string,
  json_data: { [key: string]: Record<string, unknown> },
  departmentToSchoolMapping: { [key: string]: string }
) {
  const response = await fetch(courseURL);

  const responseText = await response.text();
  const $ = cheerio.load(responseText);
  // department name
  let department: string = normalizeString($("#contentarea > h1").text());
  if (debug) {
    console.log("Department: " + department);
  }
  // strip off department id
  department = department.slice(0, department.indexOf("(")).trim();
  $("#courseinventorycontainer > .courses").each(async (i: number, course: cheerio.Element) => {
    // if page is empty for some reason??? (http://catalogue.uci.edu/allcourses/cbems/)
    if ($(course).find("h3").text().length == 0) {
      return;
    }
    //const courseBlocks: cheerio.Element[] = [];
    $(course)
      .find("div > .courseblock")
      .each(async (j: number, courseBlock: cheerio.Element) => {
        // course identification
        //courseBlocks.push(courseBlock);
        let courseInfo;
        // wrap in try catch, and if fails sleep for a second and try again
        while (courseInfo == null) {
          try {
            await getCourseInfo(courseBlock, courseURL).then((response) => {
              courseInfo = response;
            });
          } catch (error) {
            await sleep(1000);
          }
        }
        let courseID: string = courseInfo[0];
        const courseName: string = courseInfo[1];
        const courseUnits: string = courseInfo[2];
        if (debug) {
          console.log("\t", courseID, courseName, courseUnits);
        }
        // get course body (0:Course Description, 1:Prerequisite)
        const courseBody = $(courseBlock).find("div").find("p");
        const courseDescription: string = normalizeString($(courseBody[0]).text());
        // parse units
        let unit_range: string[];
        if (courseUnits.includes("-")) {
          unit_range = courseUnits.split(" ")[0].split("-");
        } else {
          unit_range = [courseUnits.split(" ")[0], courseUnits.split(" ")[0]];
        }
        // parse course number and department
        const splitID: string[] = courseID.split(" ");
        const id_department: string = splitID.slice(0, -1).join(" ");
        const id_number: string = splitID[splitID.length - 1];
        // error detection
        if (!(id_department in departmentToSchoolMapping)) {
          noSchoolDepartment.add(id_department);
        }
        // Examples at https://github.com/icssc-projects/PeterPortal/wiki/Course-Search
        // store class data into object
        const classInforamtion = {
          id: courseID.replace(" ", ""),
          department: id_department,
          number: id_number,
          school:
            id_department in departmentToSchoolMapping
              ? departmentToSchoolMapping[id_department]
              : "",
          title: courseName,
          course_level: determineCourseLevel(courseID),
          //"department_alias": ALIASES[id_department] if id_department in ALIASES else [],"department_alias": ALIASES[id_department] if id_department in ALIASES else [],
          units: unit_range.map((x) => parseFloat(x)),
          description: courseDescription,
          department_name: department,
          professor_history: [],
          prerequisite_tree: "",
          prerequisite_list: [],
          prerequisite_text: "",
          prerequisite_for: [],
          repeatability: "",
          grading_option: "",
          concurrent: "",
          same_as: "",
          restriction: "",
          overlap: "",
          corequisite: "",
          ge_list: [],
          ge_text: "",
          terms: [],
        };
        // key with no spaces
        courseID = courseID.replace(" ", "");
        // stores dictionaries in json_data to add dependencies later
        json_data[courseID] = classInforamtion;
        // populates the dic with simple information
        await parseCourseBody(courseBody, responseText, classInforamtion);

        // try to parse prerequisite
        if (courseBody.length > 1) {
          //const node = parsePrerequisite(courseBody[1], response, classInforamtion);
          // maps the course to its requirement Node
          // json_data[courseID]["node"] = node // This was commented out in original python doc so... ???
        }
        // doesn't have any prerequisites
        else {
          if (debug) {
            console.log("\t\tNOREQS");
          }
        }
      });
    // const courseBlockPromises: Promise<string[]>[] = courseBlocks.map(x => getCourseInfo(x, courseURL));
    // const courseBlockResults: string[][] = await Promise.all(courseBlockPromises);
    // console.log(courseBlockResults);
  });
}

/**
 * @param {cheerio.Element} courseBlock: a courseblock tag
 * @param {string} courseURL: URL to a catalogue department page
 * @returns {Promise<string[]>}: array[courseID, courseName, courseUnits]
 * Example: ['I&C SCI 6B', "Boolean Logic and Discrete Structures", "4 Units."]
 */
export async function getCourseInfo(
  courseBlock: cheerio.Element,
  courseURL: string
): Promise<string[]> {
  const response = await fetch(courseURL);
  const $ = cheerio.load(await response.text());
  // Regex filed into three categories (id, name, units) each representing an element in the return array
  const courseInfoPatternWithUnits =
    /(?<id>.*[0-9]+[^.]*)\. +(?<name>.*)\. +(?<units>\d*\.?\d.*Units?)\./;
  const courseInfoPatternWithoutUnits = /(?<id>.*[0-9]+[^.]*)\. (?<name>.*)\./;
  const courseBlockString: string = normalizeString($(courseBlock).find("p").text().trim());
  if (courseBlockString.includes("Unit")) {
    const res = courseBlockString.match(courseInfoPatternWithUnits);
    if (res !== null && res.groups) {
      return [res.groups.id.trim(), res.groups.name.trim(), res.groups.units.trim()];
    } else {
      throw new Error("Error: res object is either empty or does not contain the groups property");
    }
  } else {
    const res = courseBlockString.match(courseInfoPatternWithoutUnits);
    if (res !== null && res.groups) {
      return [res.groups.id.trim(), res.groups.name.trim(), "0 Units."];
    } else {
      throw new Error("Error: res object is either empty or does not contain the groups property");
    }
  }
}

/**
 * @param {string} id_number: the number part of a course id (122A)
 * @returns {string}: one of the three strings: (Lower Division (1-99), Upper Division (100-199), Graduate/Professional Only (200+))
 * Example: "I&C Sci 33" => "(Lower Division (1-99)", "COMPSCI 143A" => "Upper Division (100-199)", "CompSci 206" => "Graduate/Professional Only (200+)"
 */
export function determineCourseLevel(id_number: string) {
  // extract only the number 122A => 122
  const courseString: string = id_number.replace(/\D/g, "");
  if (courseString === "") {
    // if courseString is empty, then id_number did not contain any numbers
    console.log("COURSE LEVEL ERROR, NO ID IN STRING", id_number);
    return "";
  }
  const courseNumber = Number(courseString);
  if (courseNumber < 100) {
    return "Lower Division (1-99)";
  } else if (courseNumber < 200) {
    return "Upper Division (100-199)";
  } else if (courseNumber >= 200) {
    return "Graduate/Professional Only (200+)";
  } else {
    console.log("COURSE LEVEL ERROR", courseNumber);
    return "";
  }
}

/**
 * @param {cheerio.Element} courseBody: a collection of ptags within a courseblock
 * @param {string} responseText: response text
 * @param {Record<string, unknown>} classInfo: a map to store parsed information
 * @returns {void}: nothing, mutates the mapping passed in
 */
export async function parseCourseBody(
  courseBody: object,
  responseText: string,
  classInfo: Record<string, unknown>
) {
  const $ = cheerio.load(responseText);
  // iterate through each ptag for the course
  $(courseBody).each((i, ptag) => {
    let pTagText = normalizeString($(ptag).text().trim());
    // if starts with ( and has I or V in it, probably a GE tag
    if (
      pTagText.length > 0 &&
      pTagText[0] === "(" &&
      (pTagText.includes("I") || pTagText.includes("V"))
    ) {
      // try to parse GE types
      const ges = /(?<type>[IV]+)\.?(?<subtype>[abAB]?)/g;
      if (debug) {
        console.log("\t\tGE:");
      }
      let match: RegExpExecArray | null;
      while ((match = ges.exec(pTagText)) !== null) {
        // normalize IA and VA to Ia and Va
        const extractedGE: string =
          (match.groups?.type ?? "") + match.groups?.subtype.toLowerCase();
        // normalize in full string also
        pTagText = pTagText.replace(
          (match.groups?.type ?? "") + match.groups?.subtype,
          extractedGE
        );
        // add to ge_types
        if (classInfo["ge_list"] instanceof Array) {
          classInfo["ge_list"].push(GE_DICTIONARY[extractedGE]);
        }
        if (debug) {
          console.log(`${GE_DICTIONARY[extractedGE]} `);
        }
      }
      if (debug) {
        console.log();
      }
      // store the full string
      classInfo["ge_text"] = pTagText;
    }
    // try to match keywords like "grading option", "repeatability"
    for (const keyWord of Object.keys(classInfo)) {
      const possibleMatch: RegExpExecArray | null = RegExp(
        `^${keyWord.replace("_", " ")}s?\\s?(with\\s)?(:\\s)?(?<value>.*)`,
        "i"
      ).exec(pTagText);
      if (possibleMatch && (classInfo[keyWord] as []).length === 0) {
        classInfo[keyWord] = possibleMatch.groups?.value;
        break;
      }
    }
  });
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @param filename the file to write the result to
 * @returns {void}: writes the json_data to a json file
 */
function writeJsonData(json_data: Record<string, unknown>, filename = "./course_data.json"): void {
  console.log(`\nWriting JSON to ${filename}...`);
  //const bar = new ProgressBar(Object.keys(json_data).length, debug);
  // Maybe delete the existing data?
  fs.writeFile(filename, JSON.stringify(json_data), (error) => {
    if (error) {
      console.error("Error writing to file " + filename, error);
    } else {
      console.log("Exported instructors data to", filename + "course_data.json");
    }
  });
}

async function parseCourses(
  departmentToSchoolMapping: { [key: string]: string },
  JSON_data: Record<string, Record<string, unknown>>
) {
  const allCourseURLS = await getAllCourseURLS();
  console.log("\nParsing Each Course URL...");
  // populate json_data
  for (const classURL of allCourseURLS) {
    await getAllCourses(classURL, JSON_data, departmentToSchoolMapping);
  }
}
// whether to print out info
const debug = true;
// debugging information
const noSchoolDepartment = new Set();

// store the data
let json_data = {};
let departmentToSchoolMapping = {};

async function main() {
  // scrape data if not using cache option
  // maps department code to school
  departmentToSchoolMapping = await getDepartmentToSchoolMapping();
  console.log(departmentToSchoolMapping);
  await parseCourses(departmentToSchoolMapping, json_data);
  json_data = Object.fromEntries(
    Object.entries(json_data).map((x) => {
      x[0] = x[0].replace(" ", "");
      delete (x[1] as { id?: string }).id;
      (x[1] as { title: string }).title = (x[1] as { title: string }).title
        .split(".  ")[0]
        .replace("  ", " ");
      return x;
    })
  );
  fs.writeFileSync(join(__dirname, COURSES_DATA_NAME), JSON.stringify(json_data)); //is this a correct translation?
  console.log("Successfully parsed all course URLs!");
  // write data to index into elasticSearch
  writeJsonData(json_data);
  if (noSchoolDepartment.size === 0) {
    console.log("SUCCESS! ALL DEPARTMENTS HAVE A SCHOOL!");
  } else {
    console.log(
      "FAILED!",
      noSchoolDepartment,
      "DO NOT HAVE A SCHOOL!! MUST HARD CODE IT AT getDepartmentToSchoolMapping"
    );
  }
}

main();
