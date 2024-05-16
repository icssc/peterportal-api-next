import { CheerioAPI, load } from "cheerio";
import fetch from "cross-fetch";

function formatDepartment(department: string) {
  const match = department.match(/^(?<code>.+?) \.(?:\.|\s)+(?<name>.+)$/);
  if (match?.groups) {
    return {
      code: match.groups.code,
      name: match.groups.name,
    };
  }

  throw new Error(`Failed to parse department: ${department}`);
}

async function getDepartments(webSocContent: CheerioAPI) {
  const $ = webSocContent;

  const departments: string[] = [];
  $('select[name="Dept"] option').each((_index, element) => {
    const deptText = $(element).text().trim();

    if (deptText !== "Include All Departments") {
      departments.push(deptText);
    }
  });

  return departments.map(formatDepartment);
}

function formatTerm(term: string) {
  const match = term.match(/^(?<year>\d+) {2}(?<term>.+)$/);

  if (match?.groups) {
    return {
      year: match.groups.year,
      term: match.groups.term,
    };
  }

  throw new Error(`Failed to parse term: ${term}`);
}

async function getTerms(webSocContent: CheerioAPI) {
  const $ = webSocContent;

  const terms: string[] = [];
  $('select[name="YearTerm"] option').each((_index, element) => {
    const termText = $(element).text().trim();
    terms.push(termText);
  });

  return terms.map(formatTerm);
}

async function fetchWebSoc() {
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc");
  const body = await response.text();
  return load(body);
}

async function getDepartmentsTerms() {
  const webSocContent = await fetchWebSoc();

  const terms = await getTerms(webSocContent);
  const departments = await getDepartments(webSocContent);

  return { departments, terms };
}

export default getDepartmentsTerms;
