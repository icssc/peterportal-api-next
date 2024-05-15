import { CheerioAPI, load } from "cheerio";
import fetch from "cross-fetch";

async function fetchWebSoc() {
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc");
  const body = await response.text();
  return load(body);
}

async function getDepartments(webSocContent: CheerioAPI): Promise<string[]> {
  const $ = webSocContent;

  const departments: string[] = [];
  $('select[name="Dept"] option').each((_index, element) => {
    const deptText = $(element).text().trim();

    if (deptText !== "Include All Departments") {
      departments.push(deptText);
    }
  });

  return departments;
}

async function getTerms(webSocContent: CheerioAPI): Promise<string[]> {
  const $ = webSocContent;

  const terms: string[] = [];
  $('select[name="YearTerm"] option').each((_index, element) => {
    const termText = $(element).text().trim();
    terms.push(termText);
  });

  return terms;
}

async function getDepartmentsTerms() {
  const webSocContent = await fetchWebSoc();

  const terms = await getTerms(webSocContent);
  const departments = await getDepartments(webSocContent);

  return { departments, terms };
}

getDepartmentsTerms().then(console.log);

export default getDepartmentsTerms;
