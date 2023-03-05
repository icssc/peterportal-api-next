import axios from 'axios';
import * as cheerio from 'cheerio';
import he from 'he';
import pLimit from 'p-limit';
import stringSimilarity from 'string-similarity';


const limit = pLimit(600);   // Max number of concurrent calls

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
    results: InstructorsInfo,
    log: InstructorsLog
};

type InstructorsInfo = {
  [ucinetid: string]: Instructor
};

type InstructorsLog = {
    faculty_links: [number, { [faculty_link: string]: string }],      // Mapping of faculty links to departments
    faculty_links_failed: [number, string[]],       // Faculty links that failed to be requested
    instructors_found: [number, string[]],               // Instructors listed in faculty pages
    instructors_dir_found: [number, string[]]         // Instructors found in directory
    instructors_dir_not_found: [number, string[]],    // Instructors not found in directory
    instructors_dir_failed: [number, string[]],       // Instructors that failed to be requested (usually due to network error)
    instructors_course_history_failed: [number, string[]],   // Instructors whose course history that failed to be requested 
};

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getAllInstructors(): Promise<InstructorsData> {
    const instructorsLog: InstructorsLog = {
        faculty_links: [0, {}],
        faculty_links_failed: [0, []],
        instructors_found: [0, []],
        instructors_dir_found: [0, []],
        instructors_dir_not_found: [0, []],
        instructors_dir_failed: [0, []],
        instructors_course_history_failed: [0, []]
    }
    const facultyLinks = await getFacultyLinks();
    instructorsLog['faculty_links'] = [Object.keys(facultyLinks).length, facultyLinks];
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
            if (!(name in instructorsDict)) {
                instructorsDict[name] = {
                    schools: [facultyLinks[link]], 
                    courses: new Set(facultyCourses[i])
                }
                instructorsLog['instructors_found'][0] += 1
                instructorsLog['instructors_found'][1].push(name);
            }
            // Instructor referenced in multiple faculty pages
            else {
                instructorsDict[name].schools.push(facultyLinks[link]);
                facultyCourses[i].forEach(instructorsDict[name].courses.add, instructorsDict[name].courses);
            }
        });
    })
    console.log("Retrieved", Object.keys(instructorsDict).length, "faculty names")
    const instructorPromises = Object.keys(instructorsDict).map(name => limit(() =>  
        getInstructor(name, instructorsDict[name].schools, Array.from(instructorsDict[name].courses), 5)

    ));
    const instructors = await Promise.all(instructorPromises);
    const instructorsInfo: InstructorsInfo = {};
    instructors.forEach(instructorResult => {
        const name = instructorResult[1]['name'];
        const ucinetid = instructorResult[1]['ucinetid'];
        switch (instructorResult[0]) {
            case 'FOUND':
                instructorsLog['instructors_dir_found'][0] += 1
                instructorsLog['instructors_dir_found'][1].push(name);
                instructorsInfo[ucinetid] = instructorResult[1]; 
                break;
            case 'NOT_FOUND':
                instructorsLog['instructors_dir_not_found'][0] += 1
                instructorsLog['instructors_dir_not_found'][1].push(name);
                break;
            case 'FAILED':
                instructorsLog['instructors_dir_failed'][0] += 1
                instructorsLog['instructors_dir_failed'][1].push(name);
                break;
            case 'HISTORY_FAILED':
                instructorsLog['instructors_course_history_failed'][0] += 1
                instructorsLog['instructors_course_history_failed'][1].push(name);
                instructorsInfo[ucinetid] = instructorResult[1]; 
                break;
        }
    });
    return {
        results: instructorsInfo,
        log: instructorsLog
    }
}


export async function getInstructor(instructorName: string, schools: string[], relatedDepartments: string[], attempts: number): Promise<[string, Instructor]> {
    const instructorObject: Instructor = {
        name: instructorName, 
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
        const directoryInfo = await getDirectoryInfo(instructorName, attempts);
        if ('NOT_FOUND' in directoryInfo) {
            console.log(`WARNING! ${instructorName} cannot be found in Directory!`);
            return ['NOT_FOUND', instructorObject];
        }
        if ('FAILED' in directoryInfo) {
            return ['FAILED', instructorObject];
        }
        instructorObject['name'] = directoryInfo['name'];
        instructorObject['ucinetid'] = directoryInfo['ucinetid'];
        instructorObject['title'] = directoryInfo['title'];
        instructorObject['department'] = directoryInfo['department'];
        instructorObject['email'] = directoryInfo['email'];

        // const courseHistory = await getCourseHistory(instructorObject['name'], relatedDepartments, attempts);
        // instructorObject['shortened_name'] = courseHistory[1]['shortened_name'];
        // instructorObject['course_history'] = courseHistory[1]['course_history'];
        // if (courseHistory[0] === 'FAILED') {
        //     return ['HISTORY_FAILED', instructorObject];
        // }
    }
    catch (error) {
        if (attempts === 1) {
            return ['FAILED', instructorObject];
        }
        sleep(1000)
        await getInstructor(instructorName, schools, relatedDepartments, attempts-1);
    }
    return ['FOUND', instructorObject];
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
            let name = $(this).find('.name').text();
            name = name.split(',')[0];  // Remove suffixes that begin with ","  ex: ", Jr."
            name = name.replace(/\s*\b(?:I{2,3}|IV|V|VI{0,3}|IX)\b$/, ""); // Remove roman numeral suffixes ex: "III"
            name = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');   // Remove Accents Diacritics
            result.push(name);
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
 * Gets the instructor's directory info.
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
export async function getDirectoryInfo(instructorName: string, attempts: number): Promise<{ [key: string]: string }> {
    if (attempts === 0) {
        return {'FAILED': instructorName};
    }
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    let name = instructorName.replace(/\./g,'');  // remove '.' from name
    const data = {
        'uciKey': name,
        'filter': 'all' // "all" instead of "staff" bc some instructors are not "staff" (?)
    };
    try {
        // Try multiple attempts to get results bc the directory is so inconsistent
        let response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });  // Search with base name
        // Try stripping '-' from name
        if (response.data.length === 0 && name.includes('-')) {
                data['uciKey'] = name.replace(/-/g, '');
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers })
        }
        // Try prepending all single characters to the next word "Alexander W Thornton" -> "Alexander WThornton"
        if (response.data.length === 0 && /(\b\w{1})\s(\w+)/g.test(name)) {
            data['uciKey'] = name.replace(/(\b\w{1})\s(\w+)/g, '$1$2');
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers })
        }
        const nameSplit = name.split(' ');
        // Try parts surrounding middle initial
        if (response.data.length === 0 && nameSplit.length > 2 && nameSplit[1].length === 1) {
            data['uciKey'] = nameSplit[0] + ' ' + nameSplit[2];
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        }
        // Try first and last part of name
        if (response.data.length === 0) {
            data['uciKey'] = nameSplit[0] + ' ' + nameSplit[nameSplit.length-1];
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        }
        // Try first and last part of name but shorter first name
        if (response.data.length === 0 && nameSplit[0].length > 7) {
            data['uciKey'] = nameSplit[0].slice(0, 5) + ' ' + nameSplit[nameSplit.length-1];
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        }
        // Try name without last part
        if (response.data.length == 0 && nameSplit.length > 2 && nameSplit[1].length > 1) {
            data['uciKey'] = nameSplit.slice(0, -1).join(' ');
            response = await axios.post(URL_TO_DIRECTORY, data, { headers: headers });
        }
        let json;
        // 1 result found, likely hit
        //console.log(response.data)
        if (response.data.length == 1) {
            json = response.data[0][1];
        }
        // Multiple results, need to find best match
        else if (response.data.length > 1) {
            // Retrieve names with highest match score
            const nameResults = [strToTitleCase(response.data[0][1]['Name'])];
            for (let i=1; i<response.data.length; i++) {
                if (response.data[i][0] == response.data[0][0]) {
                    nameResults.push(strToTitleCase(response.data[i][1]['Name']));  
                }
            }
            const nameScores = response.data.map((res: [number, { [key: string]: string }]) => [res[0], res[1]['Name']]);
            const match = stringSimilarity.findBestMatch(name, nameResults);
            nameResults.push(strToTitleCase('Joseph Wu'))
            nameResults.push(strToTitleCase(he.decode(response.data[1][1]['Name'])))
            if (match['bestMatch']['rating'] >= 0.5) {
                json = response.data[match['bestMatchIndex']][1];
            }
            // Check if Nickname matches
            else if (stringSimilarity.compareTwoStrings(name, response.data[match['bestMatchIndex']][1]['Nickname']) >= 0.5) {
                json = response.data[match['bestMatchIndex']][1];
            }
        }
        if (json) {
            return {
                'name': strToTitleCase(json.Name),  // For some reason returned names can be capitalized like bruh ("MILENA MIHAIL")
                'ucinetid': json.UCInetID,
                'title': he.decode(json.Title), // decode HTML encoded char
                'department': he.decode(json.Department),
                'email': Buffer.from(json.Email, 'base64').toString('utf8') // decode Base64 email
            }
        }

    }
    catch (error) {
        await sleep(1000);
        return await getDirectoryInfo(name, attempts-1);
    }
    // No match found
    return {'NOT_FOUND': instructorName};
}


/**
 * Converts string to title case.
 * 
 * @param str - String
 * @returns {string} String in title case
 */
export function strToTitleCase(str: string): string {
    const strArray = str.toLocaleLowerCase().split(' ');
    const titleCaseStr = strArray.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return titleCaseStr;
}


/**
 * Gets the professor's course history by searching them on websoc.
 * 
 * @param instructorName - Name of instructor
 * @param relatedDepartments - A list of departments related to the instructor
 * @param attempts - Number of times a page will be requested if fail
 * @returns {object} A dictionary containing the instructor's "shortened_name" and "course_history"
 */
export async function getCourseHistory(instructorName: string, relatedDepartments: string[], attempts: number)
: Promise<[
    string,
    {
        shortened_name: string, 
        course_history: { 
            [course_id: string]: string[]
        }
    }
]> {
    const courseHistory: { [key: string]: Set<string> } = {};
    const nameCounts: { [key: string]: number } = {};
    let page: string;
    let continueParsing: boolean;
    let status;
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
        page = await fetchHistoryPage(params, attempts);
        continueParsing = parseHistoryPage(page, relatedDepartments, courseHistory, nameCounts);
        // Set up parameters to parse previous pages (older course pages)
        let row = 1;
        params['action'] = 'Prev';
        params['start_row'] = row.toString();
        while (continueParsing) {
            console.log(name)
            page = await fetchHistoryPage(params, attempts);
            continueParsing = parseHistoryPage(page, relatedDepartments, courseHistory, nameCounts);
            row += 101
            params['start_row'] = row.toString();
        }
        status = 'FOUND';
        // Determine most common shortened name 
        if (Object.keys(nameCounts).length > 0) {
            shortenedName = Object.keys(nameCounts).reduce((a, b) => nameCounts[a] > nameCounts[b] ? a: b);  // Get name with greatest count
        }
    }
    catch (error) {
        status = 'FAILED';
    }
    // Convert sets to lists
    const courseHistoryListed: { [key: string]: string[] }= {};
    for (const courseId in courseHistory) {
        courseHistoryListed[courseId] = Array.from(courseHistory[courseId]);
    }
    return [
        status, {
            'shortened_name': shortenedName,
            'course_history': courseHistoryListed
        }
    ];
}


export async function fetchHistoryPage(params: { [key: string]: string }, attempts: number): Promise<string> {
    try {
        const response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
        return response.data;
    }
    catch (error) {
        if (attempts > 0) {
            await sleep(1000);
            fetchHistoryPage(params, attempts-1);
        }
    }
    return '';
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

async function main() {
    const w = await getAllInstructors();
    console.log(w['log'])
    // const dept = await getDepartmentCourses('http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty')
    // console.log('...')
    // console.log(await getInstructor('Alexander W. Thornton', ["ICS"], dept, 3));
    //console.log(await getInstructor('Alexander Thornton'))
}
main();