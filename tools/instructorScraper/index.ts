import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import he from 'he';
// import { getCourseInfo } from '../courseScraper/'


const CATALOGUE_BASE_URL: string = 'http://catalogue.uci.edu';
const URL_TO_ALL_SCHOOLS: string = 'http://catalogue.uci.edu/schoolsandprograms/';
const URL_TO_DIRECTORY: string = 'https://directory.uci.edu/';
const URL_TO_INSTRUCT_HISTORY = 'http://www.reg.uci.edu/perl/InstructHist';


/**
 * Returns the faculty links and their corresponding school name
 * 
 * @returns {Promise<object>}: A map of all faculty links to their corresponding school
 * Example:
 *      {'http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty':'Claire Trevor School of the Arts',
 *      'http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofbiomedicalengineering/#faculty':'The Henry Samueli School of Engineering', ...}
 */
async function getFacultyLinks(): Promise<{ [key: string]: string }> {
    const result: { [key: string]: string } = {};
    try {
        /**
         * Asynchronously traverse the school's page to retrieve its correpsonding faculty links.
         * Depth determines how many times this function will recurse.
         * 
         * @param {string} schoolUrl - URL to scrape data from
         * @param {string} schoolName - Name of the school
         * @param {number} depth - Depth of search for faculty links
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
async function getInstructorNames(facultyLink: string): Promise< string[] > {
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


async function getDepartmentCodes(facultyLink: string): Promise<string[]> {
    const departmentCodes: string[] = [];
    const response = await axios.get(facultyLink.replace('#faculty', '#courseinventory'));
    const $ = cheerio.load(response.data);
    if ($('#courseinventorycontainer').length === 0) {
        return departmentCodes;
    }
    $('#courseinventorycontainer courses').each(function(this: cheerio.Element) {
        if ($(this).find('h3').length == 0) {
            //TODO need function from CourseScraper
        }
    })
    return ['']
}

/**
 * Some faculty pages don't have a corresponding course inventory page, so we hardcode them
 * Go to https://www.reg.uci.edu/perl/InstructHist to find course codes of faculty
 * 
 * @param {string} facultyLink - Link to faculty page
 * @returns {string[]} - A list of department codes that most of the professors have in common
 */
function getHardcodedDepartmentCodes(facultyLink: string): string[] {
    const lookup: { [key: string]: string[] } = {
        'http://catalogue.uci.edu/thepaulmerageschoolofbusiness/#faculty': ['MGMT','MGMT EP','MGMT FE','MGMT HC','MGMTMBA','MGMTPHD','MPAC'],
        'http://catalogue.uci.edu/interdisciplinarystudies/pharmacologyandtoxicology/#faculty': ['PHRMSCI','PHARM','BIO SCI'],
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
 * @param instructorName - name of instructor
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
    const name = instructorName.split(' '); // ["Alexander Thorton"]
    const lastFirstName = `${name[name.length-1], name[0][0]}.`; // "Thorton, A."
    const params = {
        'order': 'term',
        'action': 'Submit',
        'input_name': lastFirstName,
        'term_yyyyst': 'ANY',
        'start_row': '',}
    const response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
    parseHistoryPage(response.data);
    
}

function parseHistoryPage(instructorHistoryPage: string) {
   // console.log(instructorHistoryPage)
    const $ = cheerio.load(instructorHistoryPage);
    $('table table table tbody tr').each(function (this: cheerio.Element) {
        console.log($(this).text);
    });
    
}

const test = async () => {
    // const s = await getFacultyLinks();
    // console.log(Object.keys(s).length); 
    // const s = await getDirectoryInfo('Sara A. Ep');
    //const s = await getInstructorNames('http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty');
    const s = await getCourseHistory("Alexander Thorton")
    console.log(s);
}

test();
