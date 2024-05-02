import { load } from "cheerio";
import fetch from "cross-fetch";

async function loadWebSoc() {
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc");
  const body = await response.text();
  return load(body);
}

export async function getDepartments(): Promise<string[]> {
  const $ = await loadWebSoc();

  const departments: string[] = [];
  $('select[name="Dept"] option').each((_index, element) => {
    const deptText = $(element).text().trim();

    if (deptText !== "Include All Departments") {
      departments.push(deptText);
    }
  });

  return departments;
}

export async function getTerms(): Promise<string[]> {
  const $ = await loadWebSoc();

  const terms: string[] = [];
  $('select[name="YearTerm"] option').each((_index, element) => {
    const termText = $(element).text().trim();
    terms.push(termText);
  });

  return terms;
}

getDepartments().then(console.log);
getTerms().then(console.log);
