import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';


const CATALOGUE_BASE_URL: string = 'http://catalogue.uci.edu';
const URL_TO_ALL_SCHOOLS: string = 'http://catalogue.uci.edu/schoolsandprograms/';


/**
 * Returns the faculty links and their corresponding school name
 * 
 * @returns {object}: A map of all faculty links to their corresponding school
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
                    $('.levelone li a').each(function() {
                        const departmentURL = $(this).attr('href');
                        departmentLinks.push([CATALOGUE_BASE_URL + departmentURL + '#faculty', schoolName]);
                    });
                    const departmentLinksPromises = departmentLinks.map(x => getFaculty(x[0], x[1], depth-1));
                    const departmentLinksResults = await Promise.all(departmentLinksPromises);
                    departmentLinksResults.forEach(res => {
                        console.log(res)
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
        $('#textcontainer h4 a').each(function() {
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
    finally {
        return result;
    }
}



async function getDepartmentCodes(facultyLink: string): Promise<string[]> {
    const departmentCodes: string[] = [];
    const response = await axios.get(facultyLink.replace('#faculty', '#courseinventory'));
    const $ = cheerio.load(response.data);
    if ($('#courseinventorycontainer').length === 0) {
        return departmentCodes;
    }
    $('#courseinventorycontainer courses').each(function() {
        if ($(this).find('h3').length == 0) {
            //TODO need function from CourseScraper
        }
    })
    return ['']
}




const test = async () => {
    const s = await getFacultyLinks();
    console.log(Object.keys(s).length); 
}

test();
