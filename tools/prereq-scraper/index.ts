import fetch from 'cross-fetch';
import cheerio from 'cheerio';
import pLimit from 'p-limit';
import { dirname } from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import { PrereqCourse, PrerequisiteTree } from 'peterportal-api-next-types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type CourseTree = {
  courseId: string;
  courseTitle: string;
  prereqTree: PrerequisiteTree;
}

export type CourseList = Array<CourseTree>;

async function parsePage(url: string): Promise<String> {
  const response = await fetch(url);
  const data = await response.text();
  const courseList: CourseList = [];
  const fieldLabels = {
    Course: 0,
    Title: 1,
    Prerequisite: 2
  }
  try {
    const $ = cheerio.load(data);
    $("table tbody tr").each(function (this: cheerio.Element) {
      const entry = $(this).find("td");
      // Check if row entry is valid
      if ($(entry).length === 3) {
        let courseId = $(entry[fieldLabels.Course]).text().replace(/\s+/g, " ").trim();
        const courseTitle = $(entry[fieldLabels.Title]).text().replace(/\s+/g, " ").trim();
        const prereqList = $(entry[fieldLabels.Prerequisite]).text().replace(/\s+/g, " ").trim();
         // Check if entries have values
        if (!courseId || !courseTitle || !prereqList) return;
        // Some courses are formatted "{old_course} * {current_course} since {date}"
        const matches = courseId.match(/\* ([A-Z&]+ [A-Z]+ \d+[A-Z]?) since/);
        if (matches) {
          courseId = matches[1];
        }
        courseList.push({
          courseId: courseId,
          courseTitle: courseTitle,
          prereqTree: buildTree(prereqList)
        });
      }
      return true;
    });
  } catch (error) {
    console.log(error);
  }
  console.log(courseList);

  return '1';
}
// ^AP.*|^[A-Z&\s]+(\d\S*)$


function buildTree(prereqList: string): PrerequisiteTree {
  const prereqTree: PrerequisiteTree = {AND: [], OR: [], NOT: []};
  const prereqs = prereqList.split(/AND/);
  //console.log(prereqs);
  for (let prereq of prereqs) {
    prereq = prereq.trim();
    if (prereq[0] === "(") {  // Logical OR
      prereq.slice(1, -1).trim()
    } else {  // Logical AND
      console.log(prereq)
      buildLeaf(prereqTree, prereq);
    }
  }
  prereqTree.OR?.length === 0?delete prereqTree.OR:null;
  prereqTree.AND?.length === 0?delete prereqTree.AND:null;
  prereqTree.NOT?.length === 0?delete prereqTree.NOT:null;
  return prereqTree;
}

function buildLeaf(prereqTree: PrerequisiteTree, prereq: string) {
  console.log(prereq)
  if (prereq.startsWith("NO")) {
    const req = parseAntiRequisite(prereq);
    req?prereqTree.NOT?.push(req):null;
  } else {
    const req = parseRequisite(prereq);
    req?prereqTree.AND?.push(req):null;
  }
}

function parseRequisite(requisite: string): PrereqCourse |null {
  const prereq: PrereqCourse = {courseId: ""};
  // Match requisites with format "{course_ID} ( min {grade_type} = {grade} )"
  const courseWithGradeMatch = requisite.match(/^([^()]+)\s+\( min [^\s]+ = ([^\s]{0,2}) \)$/);
  if (courseWithGradeMatch) {
    return {
      courseId: courseWithGradeMatch[1].trim(),
      minGrade: courseWithGradeMatch[2].trim()
    }
  }
  // Match courses that are coreq with format "{course_ID} ( coreq )"
  const courseCoreqMatch = requisite.match(/^([^()]+)\s+\( coreq \)$/);
  if (courseCoreqMatch) {
    return {
      courseId: courseCoreqMatch[1].trim(),
      coreq: true
    }
  }
  // Match courses (AP exams included) without minimum grade
  const courseMatch = requisite.match(/^AP.*|^[A-Z0-9&\s]+(\d\S*)$/);
  if (courseMatch) {
    return {
      courseId: courseMatch[1].trim()
    }
  }
  return null;
}
  
function parseAntiRequisite(requisite: string): PrereqCourse | null {
  // Match antirequisties - AP exams with format "NO AP {exam_name} score of {grade} or greater"
  const antiAPreqMatch = requisite.match(/^NO\s(AP\s.+?)\sscore\sof\s(\d+)\sor\sgreater$/);
  if (antiAPreqMatch) {
    return {
      courseId: antiAPreqMatch[1].trim(),
      minGrade: antiAPreqMatch[2].trim()
    }
  }
  // Match antirequisites - courses with format "NO {course_ID}"
  const antiCourseMatch = requisite.match(/^NO\s[A-Z0-9&\s]+(\d\S*)$/);
  if (antiCourseMatch) {
    return {
      courseId: antiCourseMatch[1].trim(),
    }
  }
  return null;
}


const url = "https://www.reg.uci.edu/cob/prrqcgi?dept=MATH&term=202392&action=view_all";

parsePage(url).then(courses => {
  console.log(courses);
});

//parseRequisite("AP COMP SCI A ( min score = 3 )");