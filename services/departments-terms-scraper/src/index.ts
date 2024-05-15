import { CheerioAPI, load } from "cheerio";
import fetch from "cross-fetch";

async function fetchWebSoc() {
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc");
  const body = await response.text();
  return load(body);
}

async function getDepartments($: CheerioAPI): Promise<string[]> {
  const departments: string[] = [];
  $('select[name="Dept"] option').each((_index, element) => {
    const deptText = $(element).text().trim();

    if (deptText !== "Include All Departments") {
      departments.push(deptText);
    }
  });

  return departments;
}

async function getTerms($: CheerioAPI): Promise<string[]> {
  const terms: string[] = [];
  $('select[name="YearTerm"] option').each((_index, element) => {
    const termText = $(element).text().trim();
    terms.push(termText);
  });

  return terms;
}

async function getDepartmentsTerms() {
  const $ = await fetchWebSoc();

  const terms = await getTerms($);
  const departments = await getDepartments($);

  return { departments, terms };
}

export default getDepartmentsTerms;
