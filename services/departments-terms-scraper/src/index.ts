import { load } from "cheerio";
import fetch from "cross-fetch";

async function fetchWebSoc() {
  const response = await fetch("https://www.reg.uci.edu/perl/WebSoc");
  const body = await response.text();
  return load(body);
}

export async function getDepartments(): Promise<string[]> {
  const $ = await fetchWebSoc();

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
  const $ = await fetchWebSoc();

  const terms: string[] = [];
  $('select[name="YearTerm"] option').each((_index, element) => {
    const termText = $(element).text().trim();
    terms.push(termText);
  });

  return terms;
}
