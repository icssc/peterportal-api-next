import axios, { all, AxiosInstance } from "axios";
import cheerio from "cheerio";

// TODO: ADD DEBUG STATEMENTS AND FILE WRITING

// scrape links
const CATALOGUE_BASE_URL : string = "http://catalogue.uci.edu"
const URL_TO_ALL_COURSES : string = CATALOGUE_BASE_URL + "/allcourses/"
const URL_TO_ALL_SCHOOLS : string = CATALOGUE_BASE_URL + "/schoolsandprograms/"

/**
* @param {string} s: string to normalize (usually parsed from cheerio object)
* @returns {string}: a normalized string that can be safely compared to other strings
*/
function normalizeString(s: string): string{
    return s.normalize("NFKD");
}

/** 
 * @returns {Promise<{ [key: string]: string }>}: a mapping from department code to school name. Uses the catalogue.
 * Example: {"I&C SCI":"Donald Bren School of Information and Computer Sciences","IN4MATX":"Donald Bren School of Information and Computer Sciences"}
*/
async function getDepartmentToSchoolMapping(): Promise<{ [key: string]: string }> {

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
    var mapping: { [key: string]: string } = {"FIN": "The Paul Merage School of Business",
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
               "EHS": "Unaffiliated"}
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
async function mapCoursePageToSchool(mapping: { [key: string]: string }, school: string, courseURL: string) {
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
async function getAllCourseURLS():Promise<string[]> {
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
 * @param {Object} json_data: maps class to its json data ({STATS 280: {metadata: {...}, data: {...}, node: Node}})
 * @param {Object} departmentToSchoolMapping: maps department code to its school {I&C SCI: Donald Bren School of Information and Computer Sciences}
 * @returns {void}: nothing, mutates the json_data passed in
*/
async function getAllCourses(courseURL: string, json_data: Object, departmentToSchoolMapping: Object){
    const response = await axios.get(courseURL);
    const $ = cheerio.load(response.data);
    // department name
    var department: string = normalizeString($("#contentarea > h1").text());
    // strip off department id
    department = department.slice(0, department.indexOf("(")).trim();
    $("#courseinventorycontainer > .courses").each((i: any, course: cheerio.Element) => {
        // if page is empty for some reason??? (http://catalogue.uci.edu/allcourses/cbems/)
        if ($(course).find('h3').text().length == 0) {return;}
        $(course).find('div').each((j: any, courseBlock: cheerio.Element) => {
            // course identification
            //var courseID, courseName, courseUnits = getCourseInfo(courseBlock, $);
            // get course body (0:Course Description, 1:Prerequisite)
            const courseBody = $(courseBlock).find('div').children();
            //console.log(courseBody[1].length);
        })
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

// getDepartmentToSchoolMapping().then((response) => {
//     console.log(response);
// });

getAllCourseURLS().then((response) => {
    response.map(async (url) => {
        getAllCourses(url, {}, {});
    })
});