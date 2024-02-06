import { sleep } from "@libs/utils";
import { load } from "cheerio";
import fetch from "cross-fetch";

// scrape links
const CATALOGUE_BASE_URL = "https://catalogue.uci.edu";
const URL_TO_ALL_COURSES = `${CATALOGUE_BASE_URL}/allcourses/`;
const URL_TO_ALL_SCHOOLS = `${CATALOGUE_BASE_URL}/schoolsandprograms/`;

const Ia = "GE Ia: Lower Division Writing";
const Ib = "GE Ib: Upper Division Writing";
const Va = "GE Va: Quantitative Literacy";
const Vb = "GE Vb: Formal Reasoning";

const GE_DICTIONARY: Record<string, string> = {
  Ia,
  IA: Ia,
  Ib,
  IB: Ib,
  II: "GE II: Science and Technology",
  III: "GE III: Social & Behavioral Sciences",
  IV: "GE IV: Arts and Humanities",
  Va,
  VA: Va,
  "V.A": Va,
  Vb,
  VB: Vb,
  "V.B": Vb,
  VI: "GE VI: Language Other Than English",
  VII: "GE VII: Multicultural Studies",
  VIII: "GE VIII: International/Global Issues",
};

const GE_REGEXP =
  /(I[Aa])|(I[Bb])|[( ](II)[) ]|[( ](III)[) ]|(IV)|(V\.?[Aa])|(V\.?[Bb])|[( ](VI)[) ]|[( ](VII)[) ]|(VIII)/g;

type Course = {
  department: string;
  number: string;
  school: string;
  title: string;
  course_level: string;
  units: [number, number];
  description: string;
  department_name: string;
  professor_history: string[];
  prerequisite_tree: string;
  prerequisite_list: string[];
  prerequisite_text: string;
  prerequisite_for: string[];
  repeatability: string;
  grading_option: string;
  concurrent: string;
  same_as: string;
  restriction: string;
  overlap: string;
  corequisite: string;
  ge_list: string[];
  ge_text: string;
  terms: string[];
};

const normalized = (s?: string) => s?.normalize("NFKD") ?? "";

const transformUnitCount = (s: string): [number, number] =>
  s.includes("-")
    ? (s.split("-").map((x) => Number.parseFloat(x)) as unknown as [number, number])
    : [Number.parseFloat(s), Number.parseFloat(s)];

const getAttribute = (body: string[], attr: string): string =>
  body
    .filter((x) => x.includes(attr))[0]
    ?.replace(attr, "")
    .trim() ?? "";

function toCourseLevel(s: string) {
  const courseNumeric = Number.parseInt(s.replace(/\D/g, ""), 10);
  if (courseNumeric < 100) return "Lower Division (1-99)";
  if (courseNumeric < 200) return "Upper Division (100-199)";
  return "Graduate/Professional Only (200+)";
}

async function getDepartments(deptURL: string) {
  const res = await fetch(deptURL);
  await sleep(1000);
  const $ = load(await res.text());
  const departments: string[] = [];
  $("#courseinventorycontainer > .courses").each((_, dept) => {
    if (normalized($(dept).find("h3").text()) !== "") {
      departments.push(
        normalized($(dept).find(".courseblock > .courseblocktitle").first().text())
          .split(".")[0]
          .split(" ")
          .slice(0, -1)
          .join(" "),
      );
    }
  });
  return departments;
}

async function getSchoolNameAndDepartments(schoolURL: string): Promise<[string, string][]> {
  const res = await fetch(schoolURL);
  await sleep(1000);
  const $ = load(await res.text());
  const deptLinks = $(".levelone");
  const deptURLList: string[] = [];
  if (normalized($(deptLinks).text()) !== "") {
    $(deptLinks)
      .find("li")
      .each((_, departmentLink) => {
        deptURLList.push(
          `${CATALOGUE_BASE_URL}${normalized(
            $(departmentLink).find("a").attr("href"),
          )}#courseinventory`,
        );
      });
  }
  const departments = new Set(await getDepartments(schoolURL));
  for (const url of deptURLList) (await getDepartments(url)).forEach((x) => departments.add(x));
  const schoolName = normalized($("#contentarea > h1").text());
  console.log(`Found ${departments.size} departments for ${schoolName}`);
  return [...departments].map((x) => [x, schoolName]);
}

async function getSchoolToDepartmentMapping() {
  console.log("Scraping all schools");
  const res = await fetch(URL_TO_ALL_SCHOOLS);
  await sleep(1000);
  const $ = load(await res.text());
  const schoolURLs: string[] = [];
  $("#textcontainer > h4").each((_, school) => {
    schoolURLs.push(
      `${CATALOGUE_BASE_URL}${normalized($(school).find("a").attr("href"))}#courseinventory`,
    );
  });
  const schoolDataEntries: [string, string][] = [];
  for (const url of schoolURLs) schoolDataEntries.push(...(await getSchoolNameAndDepartments(url)));
  console.log(`Found ${schoolDataEntries.length} schools`);
  return new Map(schoolDataEntries);
}

async function getDepartmentToURLMapping() {
  console.log("Scraping all courses");
  const res = await fetch(URL_TO_ALL_COURSES);
  await sleep(1000);
  const $ = load(await res.text());
  const deptURLEntries: [string, string][] = [];
  $("#atozindex > ul > li > a").each((_, dept) => {
    deptURLEntries.push([
      normalized($(dept).text()).split("(")[1].slice(0, -1),
      `${CATALOGUE_BASE_URL}${normalized($(dept).attr("href"))}`,
    ]);
  });
  console.log(`Found ${deptURLEntries.length} departments`);
  return new Map(deptURLEntries);
}

async function getCoursesOfDepartment(deptURL: string) {
  console.log(`Scraping ${deptURL}`);
  const res = await fetch(deptURL);
  await sleep(1000);
  const $ = load(await res.text());
  const courses: [string, Course][] = [];
  const deptName = normalized($(".page-title").text()).split("(")[0].trim();
  $("#courseinventorycontainer > .courses > .courseblock").each((_, courseBlock) => {
    const header: string[] = normalized($(courseBlock).find(".courseblocktitle").text())
      .split("  ")
      .map((x) => (x[x.length - 1] === "." ? x.slice(0, -1).trim() : x))
      .filter((x) => x);
    const courseId = header[0];
    const courseName = header.length === 2 ? header[1] : header.slice(1, -1).join(" ");
    const units =
      header.length === 2
        ? ([0, 0] as [number, number])
        : transformUnitCount((header[header.length - 1]?.split(" ") ?? ["0"])[0]);
    const courseBody: string[] = [];
    $(courseBlock)
      .find("> div > p")
      .each((_, el) => {
        const text = normalized($(el).text())
          .split("\n")
          .filter((x) => x);
        if (text) courseBody.push(...text);
      });
    const courseIdMin = courseId.replace(/ /g, "");
    const courseIdSplit = courseId.split(" ");
    const courseNumber = courseIdSplit[courseIdSplit.length - 1];
    courses.push([
      courseIdMin,
      {
        department: courseIdSplit.slice(0, -1).join(" "),
        number: courseNumber,
        school: "",
        title: courseName,
        course_level: toCourseLevel(courseNumber),
        units,
        description: courseBody[0],
        department_name: deptName,
        professor_history: [],
        prerequisite_tree: "",
        prerequisite_list: [],
        prerequisite_text: "",
        prerequisite_for: [],
        repeatability: getAttribute(courseBody, "Repeatability: "),
        grading_option: getAttribute(courseBody, "Grading Option: "),
        concurrent: getAttribute(courseBody, "Concurrent with "),
        same_as: getAttribute(courseBody, "Same as "),
        restriction: getAttribute(courseBody, "Restriction: "),
        overlap: getAttribute(courseBody, "Overlaps with "),
        corequisite: getAttribute(courseBody, "Corequisite: "),
        ge_list: [
          ...(courseBody.filter((x) => x.match(/^\({1,2}[IV]/))[0] ?? "").matchAll(GE_REGEXP),
        ]
          .map((x) => x.filter((y) => y)[1])
          .map((x) => GE_DICTIONARY[x]),
        ge_text: courseBody.filter((x) => x.match(/^\({1,2}[IV]/))[0] ?? "",
        terms: [],
      },
    ]);
  });
  console.log(`Found ${courses.length} courses for ${deptName}`);
  return new Map(courses);
}

export async function getCourses() {
  const schoolMapping = await getSchoolToDepartmentMapping();
  const deptMapping = await getDepartmentToURLMapping();
  const missingDepartments = (await import("./missing-departments")).default;
  console.log(`Read ${missingDepartments.size} missing departments from missing-departments.ts`);
  missingDepartments.forEach((v, k) => schoolMapping.set(k, v));
  const deptsWithoutSchools = new Set([...deptMapping.keys()].filter((x) => !schoolMapping.has(x)));
  const allCourses = new Map<string, Course>();
  for (const [dept, url] of deptMapping) {
    const courses = await getCoursesOfDepartment(url);
    if (!courses.size) deptsWithoutSchools.delete(dept);
    courses.forEach((v, k) =>
      allCourses.set(k, { ...v, school: schoolMapping.get(v.department) ?? "" }),
    );
  }
  if (deptsWithoutSchools.size > 0) {
    throw new Error(
      `The departments ${[
        ...deptsWithoutSchools,
      ]} do not have a school associated with them. They must be hardcoded in 'missing-departments.ts'.`,
    );
  }
  return Object.fromEntries(allCourses.entries());
}
