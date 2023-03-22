import axios, { all, AxiosInstance } from "axios";
import cheerio from "cheerio";
import fs from "fs";

// scrape links
const CATALOGUE_BASE_URL : string = "http://catalogue.uci.edu"
const URL_TO_ALL_COURSES : string = CATALOGUE_BASE_URL + "/allcourses/"
const URL_TO_ALL_SCHOOLS : string = CATALOGUE_BASE_URL + "/schoolsandprograms/"

// output file names
const GENERATE_JSON_NAME = "all_courses.json";
const DEPT_SCHOOL_MAP_NAME = "dept_school_map.json";
const COURSES_DATA_NAME = "course_data.json";
const SPECIAL_REQS_NAME = "special_reqs.txt";
const SCHOOL_LIST_NAME = "school_list.txt";

// references
let GE_DICTIONARY: { [key:string] : string} = {
    "Ia": "GE Ia: Lower Division Writing",
    "Ib": "GE Ib: Upper Division Writing",
    "II": "GE II: Science and Technology",
    "III": "GE III: Social & Behavioral Sciences",
    "IV": "GE IV: Arts and Humanities",
    "Va": "GE Va: Quantitative Literacy",
    "Vb": "GE Vb: Formal Reasoning",
    "VI": "GE VI: Language Other Than English",
    "VII": "GE VII: Multicultural Studies",
    "VIII": "GE VIII: International/Global Issues"
}

// allow non-digit prerequisite tokens if they contain one of these words
// Example: Allow CHEM 1A to have "CHEM 1P or SAT Mathematics"
const SPECIAL_PREREQUISITE_WHITE_LIST = ["SAT ", "ACT ", "AP "]
// tokenize these separately because they contain 'and' or 'or'
const PRETOKENIZE = ["AP Physics C: Electricity and Magnetism"]


/**
 * @param ms milliseconds to sleep for
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * @param {string} str: string to normalize (usually parsed from cheerio object)
 * @param {string} find: all substrings of str that match find will be replaced with replace
 * @param {string} replace: the string that will replace all substrings of str that match find
 * @returns {string}: a string with all substrings of str that match find replaced with replace
*/
function replaceAllSubString(str: string, find: string, replace: string): string {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

/**
 * 
 * @param string string that will have meta characters escaped
 * @returns escaped string
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
* @param {string} s: string to normalize (usually parsed from cheerio object)
* @returns {string}: a normalized string that can be safely compared to other strings
*/
export function normalizeString(s: string): string{
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
        const response = await axios.get(departmentUrl);
        const $ = cheerio.load(response.data);
        // if this department has the "Courses" tab
        const departmentCourses = $("#courseinventorytab");
        if (departmentCourses.text() != '') {
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
        const response = await axios.get(schoolURL);
        const $ = cheerio.load(response.data);
        // get school name
        const school: string = normalizeString($("#contentarea > h1").text());
        if (debug) {
            console.log("School: " + school);
        }
        // if this school has the "Courses" tab
        const schoolCourses = $("#courseinventorytab");
        if (schoolCourses.text() != '') {
            // map school cheerio
            await mapCoursePageToSchool(mapping, school, schoolURL);
        }
        // look for department links
        const departmentLinks = $(".levelone")
        const departmentURLList: string[] = [];
        if ($(departmentLinks).text() != '') {
            // go through each department link
            $(departmentLinks).find("li").each((j, departmentLink) => {
                // create department cheerio
                const departmentUrl: string = CATALOGUE_BASE_URL + $(departmentLink).find('a').attr('href') + "#courseinventory";
                departmentURLList.push(departmentUrl);
            })
            const departmentLinksPromises: Promise<void>[] = departmentURLList.map(x => findSchoolNameFromDepartmentPage(x, school));
            const departmentLinksResult = await Promise.all(departmentLinksPromises);
        }
    }

    console.log("Mapping Departments to Schools...");
    // some need to be hard coded (These are mentioned in All Courses but not listed in their respective school catalogue)
    var mapping: { [key: string]: string } = {
        "FIN": "The Paul Merage School of Business",
        "ARMN": "School of Humanities",
        "BSEMD": "School of Biological Sciences",
        "ECPS": "The Henry Samueli School of Engineering",
        "BANA": "The Paul Merage School of Business",
        "SPPS": "School of Social Sciences",
        "UCDC": "Unaffiliated",
        "ROTC": "Unaffiliated",
        "NET SYS": "Donald Bren School of Information and Computer Sciences",
        "UNI STU": "Unaffiliated",
        "UNI AFF": "Unaffiliated",
        "GDIM": "Donald Bren School of Information and Computer Sciences",
        "DATA": "Donald Bren School of Information and Computer Sciences",
        "EHS": "Unaffiliated"
    }
    const response = await axios.get(URL_TO_ALL_SCHOOLS);
    const $ = cheerio.load(response.data);           
    const schoolLinks: string[] = [];
    // look through all the lis in the sidebar
    $("#textcontainer > h4").each((i, lis) => {
        // create new cheerio object based on each school
        const schoolURL: string = CATALOGUE_BASE_URL + $(lis).find('a').attr('href') + "#courseinventory"
        schoolLinks.push(schoolURL);
    })
    const schoolLinksPromises: Promise<void>[] = schoolLinks.map(x => findSchoolName(x));
    const schoolLinksResult = await Promise.all(schoolLinksPromises);
    console.log("Successfully mapped " + Object.keys(mapping).length + " departments!")
    return mapping
}

/** 
 * @param {object} mapping: the object used to map department code to school name
 * @param {string} school: the school to map to
 * @param {string} courseURL: URL to a Courses page
 * @returns {void}: nothing, mutates the mapping passed in
*/
export async function mapCoursePageToSchool(mapping: { [key: string]: string }, school: string, courseURL: string) {
    const response = await axios.get(courseURL);
    const $ = cheerio.load(response.data);
    // get all the departments under this school
    const courseBlocks: cheerio.Element[] = [];
    $("#courseinventorycontainer > .courses").each(async (i, schoolDepartment: cheerio.Element) => {
        // if department is not empty (why tf is Chemical Engr and Materials Science empty)
        var department: string = $(schoolDepartment).find('h3').text();
        if (department != '') {
            // get the department name
            department = normalizeString(department);
            // extract the first department code
            courseBlocks.push($(schoolDepartment).find('div')[0]);
        }
    })
    const courseBlockPromises: Promise<string[]>[] = courseBlocks.map(x => getCourseInfo(x, courseURL));
    const courseBlockResults: string[][] = await Promise.all(courseBlockPromises);
    courseBlockResults.forEach((courseInfo: string[]) => {
        // get the course ID from the returned array from getCourseInfo
        const courseID: string = courseInfo[0];
        const id_dept: string = courseID.split(' ').slice(0, -1).join(" ");
        // set the mapping
        if (debug) {
            console.log(`\t${id_dept}`);
        }
        mapping[id_dept] = school;
    })
}

/** 
 * @returns {Promise<string[]>}: a list of class URLS from AllCourses
 * Example: ["http://catalogue.uci.edu/allcourses/ac_eng/","http://catalogue.uci.edu/allcourses/afam/",...]
*/
export async function getAllCourseURLS():Promise<string[]> {
    console.log("Collecting Course URLs from {" + URL_TO_ALL_COURSES + "}...");
    // store all URLS in list
    var courseURLS : string[] = [];
    // access the course website to parse info
    const response = await axios.get(URL_TO_ALL_COURSES);
    const $ = cheerio.load(response.data);
    // get all the unordered lists
    $("#atozindex > ul").each((i, letterLists) => {
        // get all the list items
        $(letterLists).find('li').each((j, letterList) => {
            // prepend base url to relative path
            courseURLS.push(CATALOGUE_BASE_URL + $(letterList).find('a').attr('href'));
        })
    })
    console.log("Successfully found " + courseURLS.length + " course URLs!")
    return courseURLS
}

/** 
 * @param {string} courseURL: URL to a Courses page
 * @param {{ [key: string]: Object }} json_data: maps class to its json data ({STATS 280: {metadata: {...}, data: {...}, node: Node}})
 * @param {{ [key: string]: string }} departmentToSchoolMapping: maps department code to its school {I&C SCI: Donald Bren School of Information and Computer Sciences}
 * @returns {void}: nothing, mutates the json_data passed in
*/
export async function getAllCourses(courseURL: string, json_data: { [key: string]: Object }, departmentToSchoolMapping: { [key: string]: string }){
    const response = await axios.get(courseURL);

    const $ = cheerio.load(response.data);
    // department name
    var department: string = normalizeString($("#contentarea > h1").text());
    if (debug) {
        console.log("Department: " + department);
    }
    // strip off department id
    department = department.slice(0, department.indexOf("(")).trim();
    $("#courseinventorycontainer > .courses").each(async (i: any, course: cheerio.Element) => {
        // if page is empty for some reason??? (http://catalogue.uci.edu/allcourses/cbems/)
        if ($(course).find('h3').text().length == 0) {return;}
        //const courseBlocks: cheerio.Element[] = [];
        $(course).find('div > .courseblock').each(async (j: any, courseBlock: any) => {
            // course identification
            //courseBlocks.push(courseBlock);
            var courseInfo;
            // wrap in try catch, and if fails sleep for a second and try again
            while(courseInfo == null){
                try {  
                    await getCourseInfo(courseBlock, courseURL).then((response) => {courseInfo = response;});
                } catch (error) {  
                    await sleep(1000);
                }
            }
            var courseID: string = courseInfo[0];
            const courseName: string = courseInfo[1];
            const courseUnits: string = courseInfo[2];
            if (debug) {
                console.log("\t", courseID, courseName, courseUnits);
            }
            // get course body (0:Course Description, 1:Prerequisite)
            const courseBody = $(courseBlock).find('div').find('p');
            const courseDescription: string = normalizeString($(courseBody[0]).text());
            // parse units
            let unit_range: string[];
            if (courseUnits.includes("-")) {
                unit_range = courseUnits.split(" ")[0].split("-");
            }
            else {
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
            const classInforamtion: { [key: string]: any } = {
                "id": courseID.replace(" ", ""),
                "department": id_department,
                "number": id_number,
                "school": id_department in departmentToSchoolMapping ? departmentToSchoolMapping[id_department] : "",
                "title": courseName,
                "course_level": determineCourseLevel(courseID),
                //"department_alias": ALIASES[id_department] if id_department in ALIASES else [],"department_alias": ALIASES[id_department] if id_department in ALIASES else [],
                "units": unit_range.map(x => parseFloat(x)),
                "description": courseDescription,
                "department_name": department,
                "professor_history": [], "prerequisite_tree": "", "prerequisite_list": [], "prerequisite_text": "", "prerequisite_for": [], "repeatability": "", "grading_option": "",
                "concurrent": "", "same_as": "", "restriction": "", "overlap": "", "corequisite": "", "ge_list": [], "ge_text": "", "terms": []
            }
            // key with no spaces
            courseID = courseID.replace(" ", "")
            // stores dictionaries in json_data to add dependencies later
            json_data[courseID] = classInforamtion;
            // populates the dic with simple information
            parseCourseBody(courseBody, response, classInforamtion);

            // try to parse prerequisite
            if (courseBody.length > 1){
                const node = parsePrerequisite(courseBody[1], response, classInforamtion);
                console.log(node);
                // maps the course to its requirement Node
                // json_data[courseID]["node"] = node Why is this commented out?
            }
            // doesn't have any prerequisites
            else {
                if (debug){
                    console.log("\t\tNOREQS");
                }
            }
        })
        // const courseBlockPromises: Promise<string[]>[] = courseBlocks.map(x => getCourseInfo(x, courseURL));
        // const courseBlockResults: string[][] = await Promise.all(courseBlockPromises);
        // console.log(courseBlockResults);
    })
}

/**
 * @param {cheerio.Element} courseBlock: a courseblock tag
 * @param {string} courseURL: URL to a catalogue department page
 * @returns {Promise<string[]>}: array[courseID, courseName, courseUnits]
 * Example: ['I&C SCI 6B', "Boolean Logic and Discrete Structures", "4 Units."]
 */
export async function getCourseInfo(courseBlock: cheerio.Element, courseURL: string): Promise<string[]> {
    const response = await axios.get(courseURL);
    const $ = cheerio.load(response.data);
    // Regex filed into three categories (id, name, units) each representing an element in the return array
    const courseInfoPatternWithUnits: RegExp = /(?<id>.*[0-9]+[^.]*)\.[ ]+(?<name>.*)\.[ ]+(?<units>\d*\.?\d.*Units?)\./;
    const courseInfoPatternWithoutUnits: RegExp = /(?<id>.*[0-9]+[^.]*)\. (?<name>.*)\./;
    const courseBlockString: string = normalizeString($(courseBlock).find("p").text().trim());
    if (courseBlockString.includes("Unit")) {
        const res = courseBlockString.match(courseInfoPatternWithUnits);
        if (res !== null && res.groups) {
            return [res.groups.id.trim(), res.groups.name.trim(), res.groups.units.trim()]
        }
        else {
            throw new Error('Error: res object is either empty or does not contain the groups property');
        }
    }
    else {
        const res = courseBlockString.match(courseInfoPatternWithoutUnits);
        if (res !== null && res.groups) {
            return [res.groups.id.trim(), res.groups.name.trim(), "0 Units."]
        }
        else {
            throw new Error('Error: res object is either empty or does not contain the groups property');
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
    if (courseString === "") { // if courseString is empty, then id_number did not contain any numbers
        console.log("COURSE LEVEL ERROR, NO ID IN STRING", id_number);
        return "";
    }
    const courseNumber: number = Number(courseString);
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
 * @param {object} response: response object from axios request on courseURL
 * @param {dict} classInfo: a map to store parsed information
 * @returns {void}: nothing, mutates the mapping passed in
*/
export async function parseCourseBody(courseBody: object, response:any, classInfo: { [key: string]: any }) {
    const $ = cheerio.load(response.data);
    // iterate through each ptag for the course
    $(courseBody).each((i, ptag) => {
        let pTagText = normalizeString($(ptag).text().trim());
        // if starts with ( and has I or V in it, probably a GE tag
        if (pTagText.length > 0 && pTagText[0] === '(' && (pTagText.includes('I') || pTagText.includes('V'))) {
            // try to parse GE types
            const ges: RegExp = /(?<type>[IV]+)\.?(?<subtype>[abAB]?)/g;
            if (debug) {
                console.log('\t\tGE:');
            }
            let match: RegExpExecArray | null;
            while ((match = ges.exec(pTagText)) !== null) {
                // normalize IA and VA to Ia and Va
                const extractedGE: string = match.groups!.type + match.groups!.subtype.toLowerCase();
                // normalize in full string also
                pTagText = pTagText.replace(match.groups!.type + match.groups!.subtype, extractedGE);
                // add to ge_types
                classInfo['ge_list'].push(GE_DICTIONARY[extractedGE]);
                if (debug) {
                console.log(`${GE_DICTIONARY[extractedGE]} `);
                }
            }
            if (debug) {
                console.log();
            }
            // store the full string
            classInfo['ge_text'] = pTagText;
        }
        // try to match keywords like "grading option", "repeatability"
        for (const keyWord of Object.keys(classInfo)) {
            const possibleMatch: RegExpExecArray | null = RegExp(`^${keyWord.replace('_', ' ')}s?\\s?(with\\s)?(:\\s)?(?<value>.*)`, 'i').exec(pTagText);
            if (possibleMatch && classInfo[keyWord].length === 0) {
                classInfo[keyWord] = possibleMatch.groups!.value;
                break;
            }
        }
    })
}

/**
 * 
 * @param {any} tag: the second p tag in the course block
 * @param {object} response: response object from axios request on courseURL
 * @param {dict} classInfo: a map to store parsed information
 * @returns {any}: a requirement Node if successfully parsed, None otherwise
 */
export function parsePrerequisite(tag: any, response:any, classInfo: { [key: string]: any }){
    const $ = cheerio.load(response.data);
    // sometimes prerequisites are in the same ptag as corequisites
    const prereqRegex: RegExp = /((?<fullcoreqs>Corequisite:(?<coreqs>[^\n]*))\n)?(?<fullreqs>Prerequisite[^:]*:(?<reqs>.*))/;
    const possibleReq: RegExpMatchArray | null = normalizeString($(tag).text().trim()).match(prereqRegex);
    if (possibleReq){
        classInfo["corequisite"] = possibleReq.groups?.coreqs || "";
        classInfo["prerequisite_text"] = possibleReq.groups?.reqs || "";
        // only get the first sentence (following sentences are grade requirements like "at least C or better")
        if (possibleReq.groups?.reqs){
            let rawReqs: string = normalizeString(possibleReq.groups.reqs.split(".")[0].trim());
            for (const pretoken of PRETOKENIZE) {
                if (rawReqs.includes(pretoken)) {
                    rawReqs = rawReqs.replace(pretoken, pretoken.replace(" and ", "/").replace(" or ", "/"));
                }
            }
            // get all courses
            const extractedReqs = rawReqs.replace(/\(|\)/g, "").split(/ and | or /);
            // tokenized version: replace each class by an integer
            let tokenizedReqs = rawReqs;
            let special = false;
            // if doesnt have a link to another course, probably a special requirement
            if (!$(tag).find("a").text().length) {
                if (debug) {
                    console.log("\t\tSPECIAL REQ NO LINK:", rawReqs);
                }
                specialRequirements.add(rawReqs);
                return;
            }
            // if has a link, continue tokenizing
            for (let i = 0; i < extractedReqs.length; i++) {
                const courseRegex = /^([^a-z]+ )+[A-Z0-9]+$/;
                // if doesnt match course code regex, its probably a special requirement unless whitelisted
                if (!courseRegex.test(extractedReqs[i].trim()) && !SPECIAL_PREREQUISITE_WHITE_LIST.some(exception => extractedReqs[i].includes(exception))) {
                    if (debug) {
                        console.log("\t\tSPECIAL REQ BAD FORMAT:", rawReqs);
                    }
                    specialRequirements.add(rawReqs);
                    return;
                }
                // does the actual replacement
                tokenizedReqs = tokenizedReqs.replace(extractedReqs[i].trim(), i.toString());
            }
            // place a space between parentheses to tokenize
            // use helper function because .replace only replaces the first instance of a substring
            tokenizedReqs = replaceAllSubString(tokenizedReqs, "(", " ( ");
            tokenizedReqs = replaceAllSubString(tokenizedReqs, ")", " ) ");
            const tokens = tokenizedReqs.split(/\s+/);
            
            //const node = nodify(tokens, extractedReqs, classInfo["department"] + " " + classInfo["number"]);

            //classInfo["prerequisite_tree"] = node.toString();
            classInfo["prerequisite_list"] = extractedReqs;

            if (debug) {
                console.log("\t\tREQS:", rawReqs);
                console.log("\t\tREQSTOKENS:", tokens);
                //console.log("\t\tNODE:", node);
            }

            //return node;
        }
    }
    else {
        if (debug) {
            console.log("\t\tNOREQS");
        }
    }
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @returns {void}: sets the prerequisite info based on the prerequisite database instead of the catalogue
*/
function setReliablePrerequisites(json_data: {[key: string]: any}): void {
    console.log("\nSetting Reliable Prerequisites...");
    // const prerequisite_data = JSON.parse(
    // fs.readFileSync(prerequisiteScraper.PREREQUISITE_DATA_NAME, "utf-8")
    // );
    const reqsReplaced = [];
    // go through each prerequisite course
    //for (const courseID in prerequisite_data) {
        // if course exists in catalogue and prerequisite list is more detailed
    //     if (courseID in json_data && prerequisite_data[courseID]["prerequisiteList"].length > json_data[courseID]["prerequisite_list"].length) {
    //         reqsReplaced.push(courseID);
    //         // rewrite the prerequisite data
    //         json_data[courseID]["prerequisite_tree"] = prerequisite_data[courseID]["prerequisiteJSON"];
    //         json_data[courseID]["prerequisite_list"] = prerequisite_data[courseID]["prerequisiteList"];
    //         json_data[courseID]["prerequisite_text"] = prerequisite_data[courseID]["fullReqs"];
    //     }
    // }
    // console.log(Replaced ${reqsReplaced.length} course prerequisites!);
    // console.log("Done!");
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @returns {void}: sets the dependencies for courses
*/
function setDependencies(json_data: {[key: string]: any}): void {
    console.log("\nSetting Course Dependencies...");
    // go through each prerequisiteList to add dependencies
    for (const courseID in json_data) {
        // iterate prerequisiteList
        for (const prerequisite of json_data[courseID]["prerequisite_list"]) {
            const trimmedPrereq = prerequisite.replaceAllSubString(" ", "");
            // prereq needs to exist as a class
            if (trimmedPrereq in json_data) {
                const readableCourseID = json_data[courseID]["department"] + " " + json_data[courseID]["number"];
                json_data[trimmedPrereq]["prerequisite_for"].push(readableCourseID);
            }
        }
    }
    console.log("Done!");
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @returns {void}: sets the professorHistory for courses
*/
function setProfessorHistory(json_data: {[key: string]: any}): void {
    // console.log("\nSetting Professor History...");
    // // collection of professor information generated from professorScraper.py
    // const professor_data = require(professorScraper.PROFESSOR_DATA_NAME); NEED Professor Scraper??
    // // go through each professor data values
    // for (const professor of Object.values(professor_data)) {
    //     // go through each course that professor has taught
    //     for (const courseID of professor["course_history"]) {
    //         const trimmedCourseID = courseID.replaceAllSubString(" ", "");
    //         // course needs to exist as a class
    //         if (trimmedCourseID in json_data) {
    //             json_data[trimmedCourseID]["professor_history"].push(professor["ucinetid"]);
    //         }
    //     }
    // }
    // console.log("Done!");
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @returns {void}: writes the json_data to a json file
*/
function writeJsonData(json_data: {[key: string]: any}, filename: string = "tools/courseScraper/course_data.json"): void {
    console.log(`\nWriting JSON to ${filename}...`);
    //const bar = new ProgressBar(Object.keys(json_data).length, debug);
    // Maybe delete the existing data?
    fs.writeFile(filename, JSON.stringify(json_data), (error) => {
        if (error) {
          console.error("Error writing to file " + filename, error);
        } else {
          console.log(
            "Exported instructors data to",
            filename + "course_data.json"
          );
        }
    });
}

/**
 * @param {{[key: string]: any}} json_data: collection of class information generated from getAllCourses
 * @returns {void}: used to create the dictionary for aliases
*/
function printAllDepartments(json_data: {[key: string]: any}): void {
    const departments: {[key: string]: any[]} = {};
    for (const c of Object.values(json_data)) {
        const d = c["id_department"];
        if (!(d in departments)) {
            departments[d] = [];
        }
    }
    console.log("{" + Object.keys(departments).sort().map((k) => `${JSON.stringify(k)}: ${JSON.stringify(departments[k])},`).join("\n") + "}");
}

/**
 * @param {string} targetClass: the class to test requirements for
 * @param {string[]} takenClasses: the classes that have been taken
 * @param {boolean} expectedValue: the expected result
 * @returns {void}
*/
function testRequirements(targetClass: string, takenClasses: string[], expectedValue: boolean): void {
    // console.log(`Target: ${targetClass}, Node: ${json_data[targetClass]["node"]}, Taken: ${takenClasses}`);
    // console.log(`Expected: ${expectedValue}, Actual: ${json_data[targetClass]["node"].prereqsMet(takenClasses)}\n`);
}


// if name == main

// directory holding all the JSON file
const path = "tools/courseScraper/";
// whether to print out info
const debug = false;
// whether to use cached data instead of rescraping (for faster development/testing for prerequisite/professor)
const cache = false;
// debugging information
const specialRequirements = new Set();
const noSchoolDepartment = new Set();
//Dont know if we need this or not
// // the Selenium Chrome driver
// const options = new webdriver.chrome.Options();
// options.headless();
// if (process.env.NODE_ENV === 'production') {
//   options.addArguments("--disable-dev-shm-usage");
// }
// const driver = new webdriver.Builder()
//   .forBrowser('chrome')
//   .setChromeOptions(options)
//   .build();
// store all of the data
let json_data = {};
// put this at the end
if (!cache) {
  json_data = JSON.parse(fs.readFileSync(path + COURSES_DATA_NAME, "utf8"));
}
// scrape data if not using cache option
if (!cache) {
    // maps department code to school
    let departmentToSchoolMapping = {};
    if (!cache) {
      departmentToSchoolMapping = getDepartmentToSchoolMapping();
    }
    // Pre-reqs that are not in the database (idk if we need this)
    // const conflictFile = fs.createWriteStream(CONFLICT_PREREQ_NAME);
    // conflictFile.write(
    //   "Following courses have conflicting AND/OR logic in their prerequisites\n");
    // conflictFile.close();
  
    // get urls to scrape
    const allCourseURLS = await getAllCourseURLS();
    console.log("\nParsing Each Course URL...");
    // populate json_data
    for (const classURL of allCourseURLS) {
      await getAllCourses(classURL, json_data,
        departmentToSchoolMapping);
    }
    fs.writeFileSync(path + COURSES_DATA_NAME, JSON.stringify(json_data)); //is this a correct translation?
    console.log("Successfully parsed all course URLs!");

    // Debug information about school
    const schoolFile = fs.createWriteStream(path + SCHOOL_LIST_NAME);
    schoolFile.write("List of Schools:\n");
    for (const school of Array.from(new Set(Object.values(departmentToSchoolMapping))).sort()) {
      schoolFile.write(school + "\n");
    }
    schoolFile.close();
    if (noSchoolDepartment.size === 0) {
      console.log("SUCCESS! ALL DEPARTMENTS HAVE A SCHOOL!");
    } else {
      console.log("FAILED!", noSchoolDepartment,
        "DO NOT HAVE A SCHOOL!! MUST HARD CODE IT AT getDepartmentToSchoolMapping");
    }
  
    // Debug information about special requirements
    const specialFile = fs.createWriteStream(SPECIAL_REQS_NAME);
    specialFile.write("Special Requirements:\n");
    for (const sReq of Array.from(specialRequirements).sort()) {
      specialFile.write(sReq+"\n");
    }
    specialFile.close();
}

// set reliable prerequisites
setReliablePrerequisites(json_data);
// set dependencies between each course
setDependencies(json_data);
// set professor history
setProfessorHistory(json_data);
// write data to index into elasticSearch
writeJsonData(json_data);