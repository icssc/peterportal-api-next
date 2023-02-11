import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import he from 'he';


const CATALOGUE_BASE_URL: string = 'http://catalogue.uci.edu';
const URL_TO_ALL_SCHOOLS: string = 'http://catalogue.uci.edu/schoolsandprograms/';
const URL_TO_DIRECTORY: string = 'https://directory.uci.edu/';
const URL_TO_INSTRUCT_HISTORY = 'http://www.reg.uci.edu/perl/InstructHist';

const YEAR_THRESHOLD = 20; // Number of years to look back when grabbing course history

/**
 * Returns the faculty links and their corresponding school name
 * 
 * @returns {Promise<object>}: A map of all faculty links to their corresponding school
 * Example:
 *      {'http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty':'Claire Trevor School of the Arts',
 *      'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty':'The Henry Samueli School of Engineering', ...}
 */
export async function getFacultyLinks(): Promise<{ [key: string]: string }> {
    const result: { [key: string]: string } = {};
    try {
        /**
         * Asynchronously traverse the school's department pages to retrieve its correpsonding faculty links.
         * 
         * @param {string} schoolUrl - URL to scrape data from
         * @param {string} schoolName - Name of the school
         * @param {number} depth - Depth of search for faculty links (we only need to crawl once to get departments)
         * @returns {object}: A map of the schoolName to an array of faculty links
         * Example:
         *      {'The Henry Samueli School of Engineering': [ 'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty',
                'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofchemicalandbiomolecularengineering/#faculty', ...]}
         */
        async function getFaculty(schoolUrl: string, schoolName: string, depth: number): Promise<{ [key: string]: string[] }> {
            const response = await axios.get(schoolUrl);
            const $ = cheerio.load(response.data);
            // Return url if faculty tab is found
            if ($('#facultytab').length !== 0) {
                return {[schoolName]: [schoolUrl]};
            }
            else {
                const schoolURLs: { [key: string]: string[] } = {[schoolName]: []};
                // Only traverse when depth > 0
                if (depth >= 1) {
                    const departmentLinks: string[][] = [];
                    $('.levelone li a').each(function(this: cheerio.Element) {
                        const departmentURL = $(this).attr('href');
                        departmentLinks.push([CATALOGUE_BASE_URL + departmentURL + '#faculty', schoolName]);
                    });
                    const departmentLinksPromises = departmentLinks.map(x => getFaculty(x[0], x[1], depth-1));
                    const departmentLinksResults = await Promise.all(departmentLinksPromises);
                    departmentLinksResults.forEach(res => {
                        schoolURLs[schoolName] = schoolURLs[schoolName].concat(res[schoolName]);
                    });
                }
                return schoolURLs;
            }
        }
        // Get links to all schools and store them into an array
        const response = await axios.get(URL_TO_ALL_SCHOOLS);
        const $ = cheerio.load(response.data);
        const schoolLinks: string[][] = [];
        $('#textcontainer h4 a').each(function(this: cheerio.Element) {
            const schoolURL = $(this).attr('href');
            const schoolName = $(this).text();
            schoolLinks.push([CATALOGUE_BASE_URL + schoolURL + '#faculty', schoolName]);
        });
        // Asynchronously call getFaculty on each link
        const schoolLinksPromises = schoolLinks.map(x => getFaculty(x[0], x[1], 1)); // If depth > 1, will loop infinitely
        const schoolLinksResults = await Promise.all(schoolLinksPromises);
        schoolLinksResults.forEach(schoolURLs => {
            for (let schoolName in schoolURLs) {
                schoolURLs[schoolName].forEach(url => {
                    result[url] = schoolName;
                })
            }
        })
        return result;
    }
    catch (error) {
        console.log(error);
    }
    return result;
}


/**
 * Returns the names of instructors from a faculty page
 * 
 * @param facultyLink - link to faculty page
 * @returns {Promise<string[]>} - a list of instructor names
 */
export async function getInstructorNames(facultyLink: string): Promise< string[] > {
    const result: string[] = [];
    try {
        const response = await axios.get(facultyLink);
        const $ = cheerio.load(response.data);
        $('.faculty').each(function(this: cheerio.Element) {
            result.push($(this).find('.name').text());
        });
    }
    catch (error) {
        console.log(error);
    }
    return result;
}


/**
 * Get courses related to a faculty page
 * 
 * @param {string} facultyLink - Link to faculty page
 * @returns {string[]} - A list of courses related to the department
 * Example:
 *      ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"] - http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty
 */
export async function getDepartmentCourses(facultyLink: string): Promise<string[]> {
    const departmentCourses: string[] = [];
    const courseUrl = facultyLink.replace('#faculty', '#courseinventory');
    const response = await axios.get(courseUrl);
    const $ = cheerio.load(response.data);
    $('#courseinventorycontainer .courses').each(function(this: cheerio.Element) {
        if ($(this).find('h3').length == 0) {
            return;
        }
        const courseTitle = $(this).find('.courseblocktitle').text().trim().normalize('NFKD');  // I&C SCI 31. Introduction to Programming. 4 Units. 
        const courseID = courseTitle.substring(0, courseTitle.indexOf('.'));                    // I&C SCI 31
        const course = courseID.substring(0, courseID.lastIndexOf(' '));                        // I&C SCI
        departmentCourses.push(course);
    })
    // No courses can be found - check if hardcoded
    if (departmentCourses.length == 0) {
        return getHardcodedDepartmentCourses(facultyLink);
    }
    return departmentCourses;
}

/**
 * Some faculty pages don't have a corresponding course inventory page, so we hardcode them
 * Go to https://www.reg.uci.edu/perl/InstructHist to find courses of faculty
 * 
 * @param {string} facultyLink - Link to faculty page
 * @returns {string[]} - A list of department courses related to the department
 */
function getHardcodedDepartmentCourses(facultyLink: string): string[] {
    const lookup: { [key: string]: string[] } = {
        'http://catalogue.uci.edu/schooloflaw/#faculty': ['LAW'],
        'http://catalogue.uci.edu/schoolofmedicine/#faculty': []
    }
    if (facultyLink in lookup) {
        return lookup[facultyLink];
    }
    console.log(`WARNING! ${facultyLink} does not have an associated Courses page! Use https://www.reg.uci.edu/perl/InstructHist to hardcode.`);
    return [];
}


// async function getAllInstructors(departmentCodes: string, school:string): { [key: string] } {
// pain    
// }


/**
 * Gets the instructor's directory info
 * 
 * @param instructorName - Name of instructor
 * @returns {Promise<object>} - Dictionary of instructor's info (name, ucinetid, title, email)
 */
async function getDirectoryInfo(instructorName: string): Promise<{ [key: string]: string }> {
    const data = {'uciKey': instructorName};
    const info: { [key: string]: string } = {'name': '', 'ucinetid': '', 'title': '', 'email': ''}
    try {

        const response = await axios.post(URL_TO_DIRECTORY, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const json = response.data[0][1];
        return {
            'name': he.decode(json.Name),
            'ucinetid': json.UCInetID,
            'title': he.decode(json.Title), // decode HTML encoded char
            'email': Buffer.from(json.Email, 'base64').toString('utf8') // decode Base64 email
        }
    }
    catch (error) {
        console.log(error);
    }
    return {};
}


async function getCourseHistory(instructorName: string) {
    const courseHistory = new Set();
    const name = instructorName.split(' '); // ['Alexander Thorton']
    const lastFirstName = `${name[name.length-1]}, ${name[0][0]}.`; // 'Thorton, A.'
    console.log(lastFirstName);
    const params = {
        'order': 'term',
        'action': 'Submit',
        'input_name': lastFirstName,
        'term_yyyyst': 'ANY',
        'start_row': '',}
    const response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
    //parseHistoryPage(response.data);    
}

/**
 * Parses the instructor history page and returns true if entries are valid. This is used to determine whether
 * or not we want to continue parsing as there may be more pages of entries.
 * 
 * @param {string} instructorHistoryPage - HTML string of an instructor history page
 * @param {string[]} relatedDepartments - a list of departments related to the instructor
 * @param {Set<string>} courseHistory - a set of courses that will be mutated with course numbers found in entries
 * @param {object} nameCounts - a dictionary of instructor names storing the number of name occurrences found in entries
 * @returns {boolean} - true if entries are found, false if not
 */
function parseHistoryPage(instructorHistoryPage: string, relatedDepartments: string[], courseHistory: Set<string>, nameCounts: { [key: string]: number }): boolean {
    // Map of table fields to index
    const fieldLabels = {'qtr':0,'empty':1,'instructor':2,'courseCode':3,'dept':4,'courseNo':5,'type':6,'title':7,'units':8,'maxCap':9,'enr':10,'req':11};
    const currentYear = new Date().getFullYear() % 100;
    let entryFound = false;
    const $ = cheerio.load(instructorHistoryPage);
    $('table tbody tr').each(function (this: cheerio.Element) {
        const entry = $(this).find('td')
        // Check if row entry is valid
        if ($(entry).length == 12) {
            const qtrValue = $(entry[fieldLabels['qtr']]).text().trim();
            if (qtrValue.length < 4 && qtrValue != 'Qtr') {
                entryFound = true;
                const qtrYear = parseInt(qtrValue.replace(/\D/g, ''));
                // Stop parsing if year is older than threshold
                if (currentYear - qtrYear > YEAR_THRESHOLD) {
                    entryFound = false;
                    return;
                }
                // Get name(s) in the instructor field
                $(entry[fieldLabels['instructor']]).html()?.trim()?.split('<br>').forEach(name => {
                    nameCounts[name] = nameCounts[name] ? nameCounts[name]+1 : 1; // Increment name in nameCounts
                });
                // Get course code if dept is related
                const deptValue = $(entry[fieldLabels['dept']]).text().trim()
                if (deptValue in relatedDepartments) {
                    courseHistory.add(`${deptValue} ${$(entry[fieldLabels['courseNo']]).text().trim()}`);
                }
            }
        }
    });
    return entryFound;
    
}
