import { describe, expect, test } from '@jest/globals';
import { getDepartmentCourses, getFacultyLinks, getInstructorNames } from './index';

describe('instructorScraper tests', () => {
    test('getFacultyLinks', async () => {
        const facultyLinks = await getFacultyLinks();
        expect(facultyLinks).toHaveProperty(['http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty'], 'Claire Trevor School of the Arts');
        expect(facultyLinks).toHaveProperty(['http://catalogue.uci.edu/schoolofsocialsciences/#faculty'], 'School of Social Sciences');
        expect(facultyLinks).toHaveProperty(['http://catalogue.uci.edu/schoolofhumanities/departmentofarthistory/#faculty'], 'School of Humanities');
        expect(facultyLinks).toHaveProperty(['http://catalogue.uci.edu/thehenrysamuelischoolofengineering/departmentofcivilandenvironmentalengineering/#faculty'], 'The Henry Samueli School of Engineering');
    }, 20000);
    test('getInstructorNames', async () => {
        const artInstructorNames = await getInstructorNames('http://catalogue.uci.edu/clairetrevorschoolofthearts/#faculty');
        expect(artInstructorNames).toEqual(expect.arrayContaining(['Kei Akagi', 'Charlotte Griffin', 'Andrew A. Palermo', 'Richard J. Triplett', 'Bruce N. Yonemoto']));
        const historyInstructorNames = await getInstructorNames('http://catalogue.uci.edu/schoolofhumanities/departmentofarthistory/#faculty');
        expect(historyInstructorNames).toEqual(expect.arrayContaining(['Roland Betancourt', 'Matthew P. Canepa', 'Bridget R. Cooks Cumbo', 'Abigail Lapin Dardashti', 'Lyle Massey']));
    }, 20000);
    test('getDepartmentCourses', async () => {
        let csCourses = await getDepartmentCourses('http://catalogue.uci.edu/donaldbrenschoolofinformationandcomputersciences/#faculty');
        expect(csCourses).toEqual(expect.arrayContaining(['COMPSCI','IN4MATX','I&C SCI','SWE','STATS']));
    }, 20000)
});