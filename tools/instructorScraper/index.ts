import axios from 'axios';
import * as cheerio from 'cheerio';
import he from 'he';
import pLimit from 'p-limit';


const limit = pLimit(600000);   // Max number of concurrent calls

const CATALOGUE_BASE_URL: string = 'http://catalogue.uci.edu';
const URL_TO_ALL_SCHOOLS: string = 'http://catalogue.uci.edu/schoolsandprograms/';
const URL_TO_DIRECTORY: string = 'https://directory.uci.edu/';
const URL_TO_INSTRUCT_HISTORY = 'http://www.reg.uci.edu/perl/InstructHist';

const YEAR_THRESHOLD = 20; // Number of years to look back when grabbing course history

type Instructor = {
    name: string;
    ucinetid: string;
    title: string;
    department: string;
    email: string;
    schools: string[];
    related_departments: string[];
    shortened_name: string;
    course_history: { [course_id: string]: string[]};
};

type InstructorsData = {
  [ucinetid: string]: Instructor
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getAllInstructors() {
    const facultyLinks = await getFacultyLinks();
    console.log("Retrieved", Object.keys(facultyLinks).length, "faculty links");
    const instructorNamePromises = Object.keys(facultyLinks).map(link => getInstructorNames(link));
    await sleep(1000);  // Wait 1 second before scraping site again or catalogue.uci will throw a fit
    const facultyCoursesPromises = Object.keys(facultyLinks).map(link => getDepartmentCourses(link));
    const instructorNames = await Promise.all(instructorNamePromises);
    const facultyCourses = await Promise.all(facultyCoursesPromises);
    // Build dictionary containing instructor_name and their associated schools/courses
    const instructorsDict: {[name: string]: {schools: string[], courses: Set<string>}} = {};
    Object.keys(facultyLinks).forEach((link, i) => {
        instructorNames[i].forEach(name => {
            if (!instructorsDict[name]) {
                instructorsDict[name] = {
                    schools: [facultyLinks[link]], 
                    courses: new Set(facultyCourses[i])
                }
            }
            else {
                instructorsDict[name].schools.push(facultyLinks[link]);
                facultyCourses[i].forEach(instructorsDict[name].courses.add, instructorsDict[name].courses);
            }
        });
    })
    console.log("Retrieved", Object.keys(instructorsDict).length, "faculty members")
    const instructorPromises = Object.keys(instructorsDict).map(name => limit(() =>  
        getInstructor(name, instructorsDict[name].schools, Array.from(instructorsDict[name].courses))
    ));
    const instructors = await Promise.all(instructorPromises);
    console.log(instructors.length);

}


export async function getInstructor(instructorName: string, schools: string[], relatedDepartments: string[]): Promise<Instructor> {
    const instructorObject: Instructor = {
        name: '', 
        ucinetid: '', 
        title: '', 
        department: '', 
        email: '', 
        schools: schools, 
        related_departments: relatedDepartments, 
        shortened_name: '', 
        course_history: {}
    };
    try {
        //console.log('Getting', instructorName);
        const [directoryInfo, courseHistory] = await Promise.all([
            getDirectoryInfo(instructorName),
            getCourseHistory(instructorName, relatedDepartments)
        ]);
        if (Object.keys(directoryInfo).length === 0) {
            console.log(`WARNING! ${instructorName} cannot be found in Directory!`);
            return instructorObject;
        }
        instructorObject['name'] = directoryInfo['name'];
        instructorObject['ucinetid'] = directoryInfo['ucinetid'];
        instructorObject['title'] = directoryInfo['title'];
        instructorObject['department'] = directoryInfo['department'];
        instructorObject['email'] = directoryInfo['email'];
        instructorObject['shortened_name'] = courseHistory['shortened_name'];
        instructorObject['course_history'] = courseHistory['course_history'];
    }
    catch (error) {
        console.log(error);
    }
    return instructorObject;
}


/**
 * Returns the faculty links and their corresponding school name
 * 
 * @returns {object} A map of all faculty links to their corresponding school
 * Example:
 *      {'http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty':'Claire Trevor School of the Arts',
 *      'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty':'The Henry Samueli School of Engineering', ...}
 */
export async function getFacultyLinks(): Promise<{ [faculty_link: string]: string }> {
    const result: { [faculty_link: string]: string } = {};
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
                const schoolURLs: { [faculty_link: string]: string[] } = {[schoolName]: []};
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
        const schoolLinksPromises = schoolLinks.map(x =>  getFaculty(x[0], x[1], 1)); // If depth > 1, will loop infinitely
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
    catch (error: unknown) {
        console.log(error);
    }
    return result;
}


/**
 * Returns the names of instructors from a faculty page
 * 
 * @param facultyLink - link to faculty page
 * @returns {string[]} a list of instructor names
 */
export async function getInstructorNames(facultyLink: string): Promise<string[]> {
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
 * @param facultyLink - Link to faculty page
 * @returns {string[]} A list of courses related to the department
 * Example:
 *      ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"] - http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty
 */
export async function getDepartmentCourses(facultyLink: string): Promise<string[]> {
    const departmentCourses: string[] = [];
    try {
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
    }
    catch (error) {
        console.log(error);
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
        'http://catalogue.uci.edu/schooloflaw/#faculty': ['LAW'],
        'http://catalogue.uci.edu/schoolofmedicine/#faculty': []
    }
    if (facultyLink in lookup) {
        return lookup[facultyLink];
    }
    console.log(`WARNING! ${facultyLink} does not have an associated Courses page! Use https://www.reg.uci.edu/perl/InstructHist to hardcode.`);
    return [];
}


/**
 * Gets the instructor's directory info
 * 
 * @param instructorName - Name of instructor (replace "." with " ")
 * @returns {object} Dictionary of instructor's info
 * Example:
 *      {
            "name": "Alexander W Thornton",
            "ucinetid": "thornton", 
            "title": "Continuing Lecturer",
            "email": "thornton@uci.edu"
        }
 */
export async function getDirectoryInfo(instructorName: string): Promise<{ [key: string]: string }> {
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const name = instructorName.replace(/\./g,'');
    const data = {'uciKey': name};
    //console.log(data['uciKey']);
    try {
        let response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        // Result found using base name
        if (response.data.length !== 0) {
            const json = response.data[0][1];
            return {
                'name': he.decode(json.Name),
                'ucinetid': json.UCInetID,
                'title': he.decode(json.Title), // decode HTML encoded char
                'department': he.decode(json.Department),
                'email': Buffer.from(json.Email, 'base64').toString('utf8') // decode Base64 email
            };
        }
        // Try again without middle initial
        const nameSplit = name.split(' ');
        data['uciKey'] = [nameSplit[0], nameSplit[nameSplit.length-1]].join(' ');
        response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        if (response.data.length !== 0) {
            const json = response.data[0][1];
            // Check if second initial matches
            return {
                'name': he.decode(json.Name),
                'ucinetid': json.UCInetID,
                'title': he.decode(json.Title), // decode HTML encoded char
                'department': he.decode(json.Department),
                'email': Buffer.from(json.Email, 'base64').toString('utf8') // decode Base64 email
            };
        }
        if (response.data.length === 0) {
            return {};
        }
    }
    catch (error) {
        console.log(error);
    }
    return {};
}


/**
 * Gets the professor's course history by searching them on websoc.
 * 
 * @param instructorName - Name of instructor
 * @param relatedDepartments - A list of departments related to the instructor
 * @returns {object} A dictionary containing the instructor's "shortened_name" and "course_history"
 */
export async function getCourseHistory(instructorName: string, relatedDepartments: string[])
: Promise< {
    shortened_name: string, 
    course_history: { 
        [course_id: string]: string[]
    }
} > {
    const courseHistory: { [key: string]: Set<string> } = {};
    const nameCounts: { [key: string]: number } = {};
    const name = instructorName.replace(/\./g,'').split(' '); // ['Alexander W Thornton']
    let shortenedName = `${name[name.length-1]}, ${name[0][0]}.`; // 'Thornton, A.'
    const params = {
        'order': 'term',
        'action': 'Submit',
        'input_name': shortenedName,
        'term_yyyyst': 'ANY',
        'start_row': ''}
    try {
        // Parse first page
        let response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
        let continueParsing = parseHistoryPage(response.data, relatedDepartments, courseHistory, nameCounts);
        // Set up parameters to parse previous pages (older course pages)
        let row = 1;
        params['action'] = 'Prev';
        params['start_row'] = row.toString();
        while (continueParsing) {
            response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
            continueParsing = parseHistoryPage(response.data, relatedDepartments, courseHistory, nameCounts);
            row += 101
            params['start_row'] = row.toString();
        }
        // Determine most common shortened name 
        if (Object.keys(nameCounts).length > 0) {
            shortenedName = Object.keys(nameCounts).reduce((a, b) => nameCounts[a] > nameCounts[b] ? a: b);  // Get name with greatest count
        }
    }
    catch (error) {
        console.log(error)
    }
    // Convert sets to lists
    const courseHistoryListed: { [key: string]: string[] }= {};
    for (const courseId in courseHistory) {
        courseHistoryListed[courseId] = Array.from(courseHistory[courseId]);
    }
    return {
        'shortened_name': shortenedName,
        'course_history': courseHistoryListed
    };
}

/**
 * Parses the instructor history page and returns true if entries are valid. This is used to determine whether
 * or not we want to continue parsing as there may be more pages of entries.
 * 
 * @param instructorHistoryPage - HTML string of an instructor history page
 * @param relatedDepartments - a list of departments related to the instructor
 * @param courseHistory - a dictionary of courses where the values are a list of terms in which the course was taught
 * @param nameCounts - a dictionary of instructor names storing the number of name occurrences found in entries (used to determine the 'official' shortened name - bc older record names may differ from current) ex: Thornton A.W. = Thornton A. 
 * @returns {boolean} - true if entries are found, false if not
 */
export function parseHistoryPage(
    instructorHistoryPage: string, 
    relatedDepartments: string[], 
    courseHistory: { [key: string]: Set<string> }, 
    nameCounts: { [key: string]: number }
): boolean {
    const relatedDepartmentsSet = new Set(relatedDepartments);
    // Map of table fields to index
    const fieldLabels = {'qtr':0,'empty':1,'instructor':2,'courseCode':3,'dept':4,'courseNo':5,'type':6,'title':7,'units':8,'maxCap':9,'enr':10,'req':11};
    const currentYear = new Date().getFullYear() % 100;
    let entryFound = false;
    try {
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
                        return false;
                    }
                    // Get name(s) in the instructor field
                    $(entry[fieldLabels['instructor']]).html()?.trim()?.split('<br>').forEach(name => {
                        nameCounts[name] = nameCounts[name] ? nameCounts[name]+1 : 1; // Increment name in nameCounts
                    });
                    // Get course id if dept is related
                    const deptValue = $(entry[fieldLabels['dept']]).text().trim()
                    if (relatedDepartmentsSet.has(deptValue)) {
                        const courseId = `${deptValue} ${$(entry[fieldLabels['courseNo']]).text().trim()}`;
                        if (courseId in courseHistory) {
                            courseHistory[courseId].add(qtrValue);
                        }
                        else {
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
    }
    catch(error) {
        console.log(error);
    }
    return entryFound;
}