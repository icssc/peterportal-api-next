import axios, { all, AxiosInstance } from "axios";
import cheerio from "cheerio";

// TODO: ADD DEBUG STATEMENTS AND FILE WRITING

// scrape links
const CATALOGUE_BASE_URL : string = "http://catalogue.uci.edu"
const URL_TO_ALL_COURSES : string = CATALOGUE_BASE_URL + "/allcourses/"
const URL_TO_ALL_SCHOOLS : string = CATALOGUE_BASE_URL + "/schoolsandprograms/"

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
        console.log(id_dept);
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
                parsePrerequisite(courseBody[1], response, classInforamtion);
                // maps the course to its requirement Node
                // json_data[courseID]["node"] = node Why is this commented out?
            }
            // doesn't have any prerequisites
            else {
                //if debug:
                    //print("\t\tNOREQS")
            }
            // get course body (0:Course Description, 1:Prerequisite)
            //const courseBody = $(courseBlock).find('div').children();
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
            // if (debug) {
            //     console.log('\t\tGE:');
            // }
            let match: RegExpExecArray | null;
            while ((match = ges.exec(pTagText)) !== null) {
                // normalize IA and VA to Ia and Va
                const extractedGE: string = match.groups!.type + match.groups!.subtype.toLowerCase();
                // normalize in full string also
                pTagText = pTagText.replace(match.groups!.type + match.groups!.subtype, extractedGE);
                // add to ge_types
                classInfo['ge_list'].push(GE_DICTIONARY[extractedGE]);
                // if (debug) {
                // console.log(`${GE_DICTIONARY[extractedGE]} `);
                // }
            }
            // if (debug) {
            //     console.log();
            // }
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
                // if (debug) {
                //     console.log("\t\tSPECIAL REQ NO LINK:", rawReqs);
                // }
                specialRequirements.add(rawReqs);
                return;
            }
        }
    }
}

// getDepartmentToSchoolMapping().then((response) => {
//     console.log(response);
// });

const noSchoolDepartment = new Set<string>();
const specialRequirements = new Set<string>();

//console.log(determineCourseLevel("I&C Sci 33"));

getAllCourseURLS().then((response) => {
    response.map(async (url) => {
        getAllCourses(url, {}, {});
    })
});