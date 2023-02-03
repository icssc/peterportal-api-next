import axios, { all, AxiosInstance } from "axios";
import cheerio from "cheerio";

const AxiosInstance = axios.create();

// TODO: ADD DEBUG STATEMENTS AND FILE WRITING

// scrape links
const CATALOGUE_BASE_URL = "http://catalogue.uci.edu"
const URL_TO_ALL_COURSES = CATALOGUE_BASE_URL + "/allcourses/"
const URL_TO_ALL_SCHOOLS = CATALOGUE_BASE_URL + "/schoolsandprograms/"

function normalizeString(s: string): string{
    /*
    s: string to normalize (usually parsed from cheerio object)
    returns: a normalized string that can be safely compared to other strings
    */
    return s.normalize("NFKD");
}

async function getDepartmentToSchoolMapping(axios: AxiosInstance): Promise<Object> {
    /*
    axios: the Axios Instance used to obtain the web data
    returns: a mapping from department code to school name. Uses the catalogue.
    Example: {"I&C SCI":"Donald Bren School of Information and Computer Sciences","IN4MATX":"Donald Bren School of Information and Computer Sciences"}
    */

    // helper function that takes a URL to a department page and maps the course page to each school on that page
    async function findSchoolNameFromDepartmentPage(departmentUrl: string, school: string) {
        await axios.get(departmentUrl).then((response) => {
            const $ = cheerio.load(response.data);
            // if this department has the "Courses" tab
            const departmentCourses = $("#courseinventorytab");
            if (departmentCourses.text() != '') {
                // map school cheerio
                mapCoursePageToSchool(mapping, school, $);
            }
        }).catch(console.error);
    }

    // helper function that takes a URL to a school page and maps the course page to each school on that page
    // also checks for department links on the school page, and calls findSchoolNameFromDepartmentPage on each of them
    async function findSchoolName(schoolURL: string) {
        await axios.get(schoolURL).then(async (response) => {
            const $$ = cheerio.load(response.data);
            // get school name
            const school = normalizeString($$("#contentarea > h1").text());
            // if this school has the "Courses" tab
            const schoolCourses = $$("#courseinventorytab");
            if (schoolCourses.text() != '') {
                // map school cheerio
                mapCoursePageToSchool(mapping, school, $$);
            }
            // look for department links
            const departmentLinks = $$(".levelone")
            const departmentURLList: string[] = [];
            if ($$(departmentLinks).text() != '') {
                // go through each department link
                $$(departmentLinks).find("li").each(async (j, departmentLink) => {
                    // create department cheerio
                    const departmentUrl = CATALOGUE_BASE_URL + $$(departmentLink).find('a').attr('href') + "#courseinventory";
                    departmentURLList.push(departmentUrl);
                })
                const departmentLinksPromises = departmentURLList.map(x => findSchoolNameFromDepartmentPage(x, school));
                const departmentLinksResult = await Promise.all(departmentLinksPromises);
            }
        }).catch(console.error);
    }
    console.log("Mapping Departments to Schools...");
    // some need to be hard coded (These are mentioned in All Courses but not listed in their respective school catalogue)
    var mapping = {"FIN": "The Paul Merage School of Business",
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
    const $ = cheerio.load((await axios.get(URL_TO_ALL_COURSES)).data);
    const schoolLinks: string[] = [];
    await axios.get(URL_TO_ALL_SCHOOLS).then(async (response) => {
        // create cheerio object
        const $ = cheerio.load(response.data);
        const schoolLinks: string[] = [];
        // look through all the lis in the sidebar
        $("#textcontainer > h4").each((i, lis) => {
            // create new cheerio object based on each school
            const schoolURL = CATALOGUE_BASE_URL + $(lis).find('a').attr('href') + "#courseinventory"
            schoolLinks.push(schoolURL);
        })
        const schoolLinksPromises = schoolLinks.map(x => findSchoolName(x));
        const schoolLinksResult = await Promise.all(schoolLinksPromises);
    }).catch(console.error);
    console.log("Successfully mapped " + Object.keys(mapping).length + " departments!")
    return mapping
}

function mapCoursePageToSchool(mapping: Object, school: string, $) {
    /*
    mapping: the object used to map department code to school name
    school: the school to map to
    $: a cheerio object that is loaded into a Courses page
    returns: nothing, mutates the mapping passed in
    */
    // get all the departments under this school
    $("#courseinventorycontainer > .courses").each((i, schoolDepartment) => {
        // if department is not empty (why tf is Chemical Engr and Materials Science empty)
        var department = $(schoolDepartment).find('h3').text();
        if (department != '') {
            // get the department name
            department = normalizeString(department);
            // extract the first department code
            const courseID = getCourseInfo($(schoolDepartment).find('div')[0], $)[0];
            const id_dept = courseID.split(' ').slice(0, -1).join(" ");
            // set the mapping
            console.log(id_dept);
            mapping[id_dept] = school;
        }
    })
}

async function getAllCourseURLS(axios: AxiosInstance):Promise<string[]> {
    /*
    axios: the Axios Instance used to obtain the web data
    returns: a list of class URLS from AllCourses
    Example: ["http://catalogue.uci.edu/allcourses/ac_eng/","http://catalogue.uci.edu/allcourses/afam/",...]
    */
    console.log("Collecting Course URLs from {" + URL_TO_ALL_COURSES + "}...");
    // store all URLS in list
    var courseURLS = [];
    // access the course website to parse info
    await axios.get(URL_TO_ALL_COURSES).then((response) => {
        // create cheerio object
        const $ = cheerio.load(response.data);
        // get all the unordered lists
        $("#atozindex > ul").each((i, letterLists) => {
            // get all the list items
            $(letterLists).find('li').each((j, letterList) => {
                // prepend base url to relative path
                courseURLS.push(CATALOGUE_BASE_URL + $(letterList).find('a').attr('href'));
            })
        })
    }).catch(console.error);
    console.log("Successfully found " + courseURLS.length + " course URLs!")
    return courseURLS
}

function getAllCourses($, json_data: Object, departmentToSchoolMapping: Object){
    /*
    $: a cheerio object that is loaded into a Course page
    json_data: maps class to its json data ({STATS 280: {metadata: {...}, data: {...}, node: Node}})
    departmentToSchoolMapping: maps department code to its school {I&C SCI: Donald Bren School of Information and Computer Sciences}
    returns: nothing, scrapes all courses in a department page and stores information into a dictionary
    */
    // department name
    var department = normalizeString($("#contentarea > h1").text());
    // strip off department id
    department = department.slice(0, department.indexOf("(")).trim();
    $("#courseinventorycontainer > .courses").each((i, course) => {
        // if page is empty for some reason??? (http://catalogue.uci.edu/allcourses/cbems/)
        if ($(course).find('h3').text().length == 0) {return;}
        $(course).find('div').each((j, courseBlock) => {
            // course identification
            //var courseID, courseName, courseUnits = getCourseInfo(courseBlock, $);
            // get course body (0:Course Description, 1:Prerequisite)
            const courseBody = $(courseBlock).find('div').children();
            console.log(courseBody[1].length);
        })
    })
}

function getCourseInfo(courseBlock, $): string[] {
    /*
    courseBlock: a courseblock tag
    $: a cheerio object that is loaded into a Courses page
    returns: array[courseID, courseName, courseUnits]
    Example: ['I&C SCI 6B', "Boolean Logic and Discrete Structures", "4 Units."]
    */
    // Regex filed into three categories (id, name, units) each representing an element in the return array
    const courseInfoPatternWithUnits = /(?<id>.*[0-9]+[^.]*)\.[ ]+(?<name>.*)\.[ ]+(?<units>\d*\.?\d.*Units?)\./;
    const courseInfoPatternWithoutUnits = /(?<id>.*[0-9]+[^.]*)\. (?<name>.*)\./;
    const courseBlockString = normalizeString($(courseBlock).find("p").text().trim());
    if (courseBlockString.includes("Unit")) {
        const res = courseBlockString.match(courseInfoPatternWithUnits);
        return [res.groups.id.trim(), res.groups.name.trim(), res.groups.units.trim()]
    }
    else {
        const res = courseBlockString.match(courseInfoPatternWithoutUnits);
        return [res.groups.id.trim(), res.groups.name.trim(), "0 Units."]
    }
}

// getDepartmentToSchoolMapping(AxiosInstance).then((response) => {
//     console.log(response);
// });

getAllCourseURLS(AxiosInstance).then((response) => {
    response.map(async (url) => {
        await axios.get(url).then((response) => {
            const $ = cheerio.load(response.data);
            getAllCourses($, {}, {});
        }).catch(console.error);
    })
});