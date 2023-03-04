import { describe, expect, test } from "@jest/globals";
import { getCourseHistory, getDepartmentCourses, getDirectoryInfo, getFacultyLinks, getInstructorNames, parseHistoryPage, getInstructor } from "./index";
import axios from 'axios';

describe("instructorScraper tests", () => {
    test("getFacultyLinks", async () => {
        const facultyLinks = await getFacultyLinks(3);
        expect(facultyLinks).toHaveProperty(["http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty"], "Claire Trevor School of the Arts");
        expect(facultyLinks).toHaveProperty(["http://catalogue.uci.edu/schoolofsocialsciences/#faculty"], "School of Social Sciences");
        expect(facultyLinks).toHaveProperty(["http://catalogue.uci.edu/schoolofhumanities/departmentofarthistory/#faculty"], "School of Humanities");
        expect(facultyLinks).toHaveProperty(["http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofcivilandenvironmentalengineering/#faculty"], "The Henry Samueli School of Engineering");
    }, 30000);
    test("getInstructorNames", async () => {
        const artInstructorNames = await getInstructorNames("http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty");
        expect(artInstructorNames).toEqual(expect.arrayContaining(["Kei Akagi", "Charlotte Griffin", "Andrew A. Palermo", "Richard J. Triplett", "Bruce N. Yonemoto"]));
        const historyInstructorNames = await getInstructorNames("http://catalogue.uci.edu/schoolofhumanities/departmentofarthistory/#faculty");
        expect(historyInstructorNames).toEqual(expect.arrayContaining(["Roland Betancourt", "Matthew P. Canepa", "Bridget R. Cooks Cumbo", "Abigail Lapin Dardashti", "Lyle Massey"]));
        const cseInstructorNames = await getInstructorNames("https://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofelectricalengineeringandcomputerscience/#faculty");
        expect(cseInstructorNames).toEqual(expect.arrayContaining(["Hamidreza Aghasi", "Homayoun Yousefi'zadeh", "Ian G. Harris", "William C. Tang"]));
    }, 20000);
    test("getDepartmentCourses", async () => {
        const artCourses = await getDepartmentCourses("http://catalogue.uci.edu/clairetrevorschoolofthearts/#courseinventory");
        expect(artCourses).toEqual(expect.arrayContaining(["ARTS", "ART", "DANCE", "DRAMA", "MUSIC"]));
        const csCourses = await getDepartmentCourses("http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty");
        expect(csCourses).toEqual(expect.arrayContaining(["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"]));
        const busCourses = await getDepartmentCourses("http://catalogue.uci.edu/thepaulmerageschoolofbusiness/#courseinventory/#faculty");
        expect(busCourses).toEqual(expect.arrayContaining(["MGMT","MGMT EP","MGMT FE","MGMTMBA","MGMTPHD","MPAC","BANA"]));
    }, 20000);
    test("getDepartmentCourses for hardcoded courses", async () => {
        const lawCourses = await getDepartmentCourses("http://catalogue.uci.edu/schooloflaw/#faculty");
        expect(lawCourses).toEqual(["LAW"]);
        const medCourses = await getDepartmentCourses("http://catalogue.uci.edu/schoolofmedicine/");
        expect(medCourses).toEqual([]);
    }, 10000);
    test("getDirectoryInfo", async () => {
        const directory1 = await getDirectoryInfo("Kei Akagi", 3);
        expect(directory1).toEqual({
            "name": "Kei Akagi",
            "ucinetid": "kakagi", 
            "title": "Chancellor's Professor",
            "email": "kakagi@uci.edu"});
        const directory2 = await getDirectoryInfo("Alexander Thornton", 3);
        expect(directory2).toEqual({
            "name": "Alexander W Thornton",
            "ucinetid": "thornton", 
            "title": "Continuing Lecturer",
            "email": "thornton@uci.edu"});
    });
    test("parseHistoryPage on present page", async () => {
        const URL_TO_INSTRUCT_HISTORY = "http://www.reg.uci.edu/perl/InstructHist";
        const courses: { [key: string]: Set<string> } = {};
        const names: { [key: string]: number} = {};
        const params = {
            "order": "term",
            "action": "Submit",
            "input_name": "Akagi, K.",
            "term_yyyyst": "ANY",
            "start_row": ""}
        const response = await axios.get(URL_TO_INSTRUCT_HISTORY, {params});
        const bool = parseHistoryPage(response.data, ["ARTS", "ART", "DANCE", "DRAMA", "MUSIC"], courses, names);
        expect(bool).toBeTruthy();
        for (const course_id of ["MUSIC 65", "MUSIC 165", "MUSIC 176", "MUSIC 132", "MUSIC 182"]) {
            expect(courses).toHaveProperty(course_id);
        }
        expect(Object.keys(names).reduce((a, b) => names[a] > names[b] ? a: b)).toEqual('AKAGI, K.');
    }, 10000);
    test("parseHistoryPage on old page", async () => {
        const courses: { [key: string]: Set<string> } = {};
        const names: { [key: string]: number} = {};
        const response = await axios.get("https://www.reg.uci.edu/perl/InstructHist?input_name=THORNTON%2C%20A.&printer_friendly=&term_yyyyst=&order=term&action=Prev&start_row=1213&show_distribution=");
        const bool = parseHistoryPage(response.data, ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"], courses, names);
        expect(bool).toBeFalsy();
        expect(courses).toEqual({});
        expect(names).toEqual({});
    });
    test("getCourseHistory", async () => {
        const courseHistory = await getCourseHistory("Alexander W. Thornton", ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"]);
        expect(courseHistory).toHaveProperty("shortened_name", "THORNTON, A.");
        expect(courseHistory).toHaveProperty("course_history");
        expect(courseHistory["course_history"]["I&C SCI 46"]).toEqual(expect.arrayContaining(["S22", "W22", "S21", "W21", "S20", "W20", "S18", "W18", "S17", "S16", "S15", "S14"]));
    }, 50000);
    test("getInstructor", async () => {
        const instructor = await getInstructor("Alexander W. Thornton", ['ICS'], ["COMPSCI","IN4MATX","I&C SCI","SWE","STATS"]);
        expect(instructor).toHaveProperty("shortened_name", "THORNTON, A.");
        expect(instructor).toHaveProperty("name", "Alexander W Thornton");
        expect(instructor).toHaveProperty("title", "Continuing Lecturer");
        expect(instructor).toHaveProperty("email", "thornton@uci.edu");
        expect(instructor).toHaveProperty("course_history");
        expect(instructor["course_history"]["I&C SCI 46"]).toEqual(expect.arrayContaining(["S22", "W22", "S21", "W21", "S20", "W20", "S18", "W18", "S17", "S16", "S15", "S14"]));

    }, 50000);
});