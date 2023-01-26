import { PrismaClient } from "db";
import {
  callWebSocAPI,
  WebsocAPIResponse,
  WebsocCourse,
  WebsocDepartment,
  WebsocSchool,
  WebsocSection,
} from "websoc-api";

interface DeptWithSchoolName extends WebsocDepartment {
  schoolName: string;
}

interface SectionWithCourseInfo extends WebsocSection {
  deptCode: string;
  courseNumber: string;
  courseTitle: string;
}

interface InstructorWithSectionInfo {
  sectionCode: string;
  shortenedName: string;
}

function combineResponses(responses: WebsocAPIResponse[]): WebsocAPIResponse {
  const combined = responses.shift() as WebsocAPIResponse;
  for (const res of responses) {
    for (const school of res.schools) {
      const schoolIndex = combined.schools.findIndex(
        (s) => s.schoolName === school.schoolName
      );
      if (schoolIndex !== -1) {
        for (const dept of school.departments) {
          const deptIndex = combined.schools[schoolIndex].departments.findIndex(
            (d) => d.deptCode === dept.deptCode
          );
          if (deptIndex !== -1) {
            const courseSet = new Set(
              combined.schools[schoolIndex].departments[deptIndex].courses
            );
            for (const course of dept.courses) {
              courseSet.add(course);
            }
            combined.schools[schoolIndex].departments[deptIndex].courses =
              Array.from(courseSet);
          } else {
            combined.schools[schoolIndex].departments.push(dept);
          }
        }
      } else {
        combined.schools.push(school);
      }
    }
  }
  return combined;
}

function combineSchools(schools: WebsocSchool[]): DeptWithSchoolName[] {
  const ret: DeptWithSchoolName[] = [];
  for (const school of schools) {
    ret.push(
      ...school.departments.map((x) => ({
        schoolName: school.schoolName,
        ...x,
      }))
    );
  }
  return ret;
}

function combineCourses(depts: DeptWithSchoolName[]): WebsocCourse[] {
  const ret: WebsocCourse[] = [];
  for (const dept of depts) {
    ret.push(...dept.courses);
  }
  return ret;
}

function combineSections(courses: WebsocCourse[]): SectionWithCourseInfo[] {
  const ret: SectionWithCourseInfo[] = [];
  for (const course of courses) {
    ret.push(
      ...course.sections.map((x) => ({
        deptCode: course.deptCode,
        courseNumber: course.courseNumber,
        courseTitle: course.courseTitle,
        ...x,
      }))
    );
  }
  return ret;
}

function combineInstructors(
  sections: SectionWithCourseInfo[]
): InstructorWithSectionInfo[] {
  const ret: InstructorWithSectionInfo[] = [];
  for (const section of sections) {
    ret.push(
      ...section.instructors.map((x) => ({
        sectionCode: section.sectionCode,
        shortenedName: x,
      }))
    );
  }
  return ret;
}

async function handler() {
  const prisma = new PrismaClient();
  const depts = [
    "AC ENG",
    "AFAM",
    "ANATOMY",
    "ANESTH",
    "ANTHRO",
    "ARABIC",
    "ARMN",
    "ART",
    "ART HIS",
    "ARTS",
    "ARTSHUM",
    "ASIANAM",
    "BANA",
    "BATS",
    "BIO SCI",
    "BIOCHEM",
    "BME",
    "CAMPREC",
    "CBE",
    "CBEMS",
    "CEM",
    "CHC/LAT",
    "CHEM",
    "CHINESE",
    "CLASSIC",
    "CLT&THY",
    "COGS",
    "COM LIT",
    "COMPSCI",
    "CRITISM",
    "CRM/LAW",
    "CSE",
    "DANCE",
    "DATA",
    "DERM",
    "DEV BIO",
    "DRAMA",
    "E ASIAN",
    "EARTHSS",
    "EAS",
    "ECO EVO",
    "ECON",
    "ECPS",
    "ED AFF",
    "EDUC",
    "EECS",
    "EHS",
    "ENGLISH",
    "ENGR",
    "ENGRCEE",
    "ENGRMAE",
    "ENGRMSE",
    "EPIDEM",
    "ER MED",
    "EURO ST",
    "FAM MED",
    "FIN",
    "FLM&MDA",
    "FRENCH",
    "GDIM",
    "GEN&SEX",
    "GERMAN",
    "GLBL ME",
    "GLBLCLT",
    "GREEK",
    "HEBREW",
    "HINDI",
    "HISTORY",
    "HUMAN",
    "HUMARTS",
    "I&C SCI",
    "IN4MATX",
    "INNO",
    "INT MED",
    "INTL ST",
    "IRAN",
    "ITALIAN",
    "JAPANSE",
    "KOREAN",
    "LATIN",
    "LAW",
    "LINGUIS",
    "LIT JRN",
    "LPS",
    "LSCI",
    "M&MG",
    "MATH",
    "MED",
    "MED ED",
    "MED HUM",
    "MGMT",
    "MGMT EP",
    "MGMT FE",
    "MGMT HC",
    "MGMTMBA",
    "MGMTPHD",
    "MIC BIO",
    "MOL BIO",
    "MPAC",
    "MSE",
    "MUSIC",
    "NET SYS",
    "NEURBIO",
    "NEUROL",
    "NUR SCI",
    "OB/GYN",
    "OPHTHAL",
    "PATH",
    "PED GEN",
    "PEDS",
    "PERSIAN",
    "PHARM",
    "PHILOS",
    "PHMD",
    "PHRMSCI",
    "PHY SCI",
    "PHYSICS",
    "PHYSIO",
    "PLASTIC",
    "PM&R",
    "POL SCI",
    "PORTUG",
    "PP&D",
    "PSCI",
    "PSY BEH",
    "PSYCH",
    "PUB POL",
    "PUBHLTH",
    "RADIO",
    "REL STD",
    "ROTC",
    "RUSSIAN",
    "SOC SCI",
    "SOCECOL",
    "SOCIOL",
    "SPANISH",
    "SPPS",
    "STATS",
    "SURGERY",
    "SWE",
    "TAGALOG",
    "TOX",
    "UCDC",
    "UNI AFF",
    "UNI STU",
    "UPPP",
    "VIETMSE",
    "VIS STD",
    "WRITING",
  ];
  const promises = depts.map((department) =>
    callWebSocAPI({ term: "2023 Winter", department })
  );
  const res = combineResponses(await Promise.all(promises));
  const departments = combineSchools(res.schools);
  const courses = combineCourses(departments);
  const sections = combineSections(courses);
  const instructors = combineInstructors(sections);
  await prisma.soc_schools.createMany({
    data: res.schools.map((s) => ({
      school_name: s.schoolName,
      school_comment: s.schoolComment,
    })),
  });
  await prisma.soc_departments.createMany({
    data: departments.map((d) => ({
      school_name: d.schoolName,
      department_code: d.deptCode,
      department_name: d.deptName,
      department_comment: d.deptComment,
      course_number_range_comments: JSON.stringify(d.courseNumberRangeComments),
      section_code_range_comments: JSON.stringify(d.sectionCodeRangeComments),
    })),
    skipDuplicates: true,
  });
  await prisma.soc_courses.createMany({
    data: courses.map((c) => ({
      department_code: c.deptCode,
      course_number: c.courseNumber,
      course_title: c.courseTitle,
      course_comment: c.courseComment,
      prerequisite_link: c.prerequisiteLink,
    })),
    skipDuplicates: true,
  });
  await prisma.soc_sections.createMany({
    data: sections.map((s) => ({
      department_code: s.deptCode,
      course_number: s.courseNumber,
      course_title: s.courseTitle,
      section_year: "2023",
      section_quarter: "Winter",
      section_code: s.sectionCode,
      section_type: s.sectionType,
      section_num: s.sectionNum,
      units: s.units,
      meetings: JSON.stringify(s.meetings),
      final_exam: s.finalExam,
      max_capacity: s.maxCapacity,
      num_currently_enrolled_total: s.numCurrentlyEnrolled.totalEnrolled,
      num_section_enrolled_total: s.numCurrentlyEnrolled.sectionEnrolled,
      num_on_waitlist: s.numOnWaitlist,
      num_requested: s.numRequested,
      num_new_only_reserved: s.numNewOnlyReserved,
      restrictions: s.restrictions,
      section_status: s.status,
      section_comment: s.sectionComment,
    })),
  });
  await prisma.soc_instructors.createMany({
    data: instructors.map((i) => ({
      section_year: "2023",
      section_quarter: "Winter",
      section_code: i.sectionCode,
      shortened_name: i.shortenedName,
    })),
  });
  console.timeEnd("Inserting data took");
}
