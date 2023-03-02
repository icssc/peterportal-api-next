import { describe, expect, test } from "@jest/globals";
import { getDepartmentToSchoolMapping, normalizeString, mapCoursePageToSchool, getAllCourseURLS, getAllCourses, getCourseInfo, determineCourseLevel } from "./index";
import axios from 'axios';


describe("courseScraper tests", () => {
    test("getAllCourseURLS", async () => {
        const allCourseURLS = await getAllCourseURLS();
        expect(allCourseURLS).toHaveProperty(["http://catalogue.uci.edu/allcourses/gdim/"]);
    }, 30000);
    test("getDepartmentToSchoolMapping", async () => {
        const schoolMap = await getDepartmentToSchoolMapping();
    }, 20000);
    test("determineCourseLevel", async () => {
        const lowerDiv = await determineCourseLevel("I&C Sci 33");
        expect(lowerDiv).toEqual("(Lower Division (1-99)");
        const upperDiv = await determineCourseLevel("COMPSCI 143A");
        expect(upperDiv).toEqual("Upper Division (100-199)");
        const gradClass = await determineCourseLevel("CompSci 206");
        expect(gradClass).toEqual("Graduate/Professional Only (200+)");
    }, 20000);
    // test("normalizeString", async () => {
    //     const stringToNormalize = normalizeString("I&C SCI 33");
    //     expect(stringToNormalize).toEqual("I&C SCI 33");
    //     const normalString = normalizeString("I&C SCI 33");
    //     expect(normalString).toEqual("I&C SCI 33");
    // }, 10000);
});