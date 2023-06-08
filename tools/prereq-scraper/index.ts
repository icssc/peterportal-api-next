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
  const prereqListL: CourseList = [];
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
        buildTree(prereqList);
      }
      return true;
    });
  } catch (error) {

  }
  return '1';
}

function parseRequisite(requisite: string): string {
  return "";
}

function buildTree(prereqList: string): PrerequisiteTree {
  const prereqTree: PrerequisiteTree = {};
  const prereqs = prereqList.split(/AND/);
  //console.log(prereqs);
  for (let prereq of prereqs) {
    prereq = prereq.trim();
    // prereq contains OR
    if (prereq[0] === "(") {

    } else {

    }
  }
  return prereqTree;
}

const url = "https://www.reg.uci.edu/cob/prrqcgi?dept=I%26C+SCI&term=202392&action=view_all";

parsePage(url).then(courses => {
  console.log(courses);
});
