import { callWebSocAPI } from "websoc-api-next";
import { CastingContext, parse, Parser } from "csv-parse";
import { EOL } from 'os';
import fs from "fs";
import path from "path";
import type {
    Quarter,
    WebsocAPIResponse,
    WebsocSection
} from "peterportal-api-next-types";
import { stringify } from "csv-stringify/sync";
import winston from "winston";

interface RawGrade {
    year: string,
    quarter: "Fall" | "Winter" | "Spring" | "Summer",
    department: string,
    courseNumber: string,
    courseCode: number,
    instructors: null,
    a: number,
    b: number,
    c: number,
    d: number,
    f: number,
    p: number,
    np: number,
    w: number,
    gpaAvg: number
}

interface Grade {
    year: string,
    quarter: "Fall" | "Winter" | "Spring"
        | "Summer1" | "Summer10wk" | "Summer2",
    department: string,
    courseNumber: string,
    courseCode: number,
    instructors: string,
    a: number,
    b: number,
    c: number,
    d: number,
    f: number,
    p: number,
    np: number,
    w: number,
    gpaAvg: number
}

const dataColumns: string[] = [
    "year",
    "quarter",
    "department",
    "courseNumber",
    "courseCode",
    "instructors",
    "a",
    "b",
    "c",
    "d",
    "f",
    "p",
    "np",
    "w",
    "gpaAvg"
];

const summerQuarters: Quarter[] = ["Summer1", "Summer10wk", "Summer2"];

const logger: winston.Logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(), 
        winston.format.prettyPrint()
    ),
    transports: [
        new winston.transports.Console(), 
        new winston.transports.File({ filename: `./${Date.now()}.log` })
    ]
});

/**
 * Pause an executing async function for about two to three seconds.
 * @returns A promise calling setTimeout().
 */
async function wait(): Promise<void> {
    const waitTime: number =
        Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000;
    return new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Return a promise for the information on WebSOC about the course.
 * @param year The academic year for the course in the format "XXXX-XX."
 * @param quarters An array of strings. Takes ["Fall"], ["Winter"], 
 * ["Spring"], or ["Summer1", "Summer10wk", "Summer2"]. 
 * @param courseCode The five-digit course code for the class.
 * @returns An array containing the promises for making requests to WebSOC.
 */
async function getInfo(year: string, quarters: Quarter[], courseCode: string)
        : Promise<WebsocAPIResponse[]> {
    return Promise.all(quarters.map((quarter: Quarter) => callWebSocAPI(
        {
            year,
            quarter
        },
        {
            department: "ANY",
            sectionCodes: courseCode
        }
    )));
}

/**
 * Return a string for the academic year of the course.
 * @param year The academic year for the course in the format "XXXX-XX."
 * @param quarter Either "Summer", "Fall", "Winter", or "Spring."
 * @returns The academic year in the format of "XXXX."
 */
function parseYear(year: string, quarter: string): string {
    return (["Summer", "Fall"].includes(quarter))
        ? year.substring(0, 4)
        : `${parseInt(year.substring(0, 4)) + 1}`;
}

/**
 * Make requests to WebSOC using the websoc-api-next package to update
 * class information on the file.
 * @param info Raw information parsed from the file. Note that the
 * instructors field is intentionally null because there is no point
 * spending resources to allocate an array for incomplete information
 * in the file.
 * @returns If the class is not listed on WebSOC, return null. Otherwise,
 * return a JSON object containing the updated information.
 */
async function updateInformation(info: RawGrade): Promise<Grade | null> {
    const responses: WebsocAPIResponse[] = await getInfo(
        parseYear(info.year, info.quarter),
        info.quarter === "Summer" ? summerQuarters : [info.quarter],
        `${info.courseCode}`
    );
    for (let index = 0; index < responses.length; ++index) {
        if (responses[index].schools.length > 0
                && responses[index].schools[0].departments.length > 0
                && responses[index].schools[0].departments[0]
                    .courses.length > 0
                && responses[index].schools[0].departments[0].courses[0]
                    .sections.length > 0) {
            const section: WebsocSection = responses[index].schools[0]
                .departments[0].courses[0].sections[0];
            if (parseInt(section.sectionCode) === info.courseCode) {
                return {
                    ...info,
                    quarter: info.quarter !== "Summer"
                        ? info.quarter
                        : summerQuarters[index],
                    department: responses[index].schools[0].departments[0]
                        .courses[0].deptCode,
                    courseNumber: responses[index].schools[0].departments[0]
                        .courses[0].courseNumber,
                    instructors: section.instructors.join("; ")
                };
            }
        }
    }
    logger.warn("No matching course found", {
        year: info.year,
        quarter: info.quarter,
        department: info.department,
        courseNumber: info.courseNumber,
        courseCode: info.courseCode
    });
    return null;
}

/**
 * Create a CSV parser with certain settings.
 * @param filePath The absolute path to the CSV file.
 * @returns A parser for the CSV file.
 */
function buildParser(filePath: string): Parser {
    return fs
        .createReadStream(filePath)
        .pipe(parse({
            cast: (value: string, context: CastingContext): any => {
                switch (context.column) {
                    case "year":
                    case "quarter":
                    case "department":
                    case "courseNumber": 
                        return value;
                    case "courseCode":
                    case "a":
                    case "b":
                    case "c":
                    case "d":
                    case "f":
                    case "p":
                    case "np":
                    case "w":
                        return parseInt(value || "0");
                    case "instructors":
                        return null;
                    case "gpaAvg":
                        return parseFloat(value || "0");
                    default:
                        throw new Error(
                            `Unknown entry: ${context.column}=${value}`
                        );
                }
            },
            columns: dataColumns,
            from_line: 2,
            trim: true
    }));
}

/**
 * Take the CSV file under /inputData, extract the information to a JSON
 * object, and write the updated info to a file under /outputData.
 * @param filePath The absolute path to the input CSV file.
 */
async function processFile(filePath: string): Promise<void> {
    const courseParser: Parser = buildParser(filePath);
    const outputFileName: string = path.resolve(
        `${__dirname}/outputData/${path.basename(filePath, ".csv")}.output.csv`
    );

    let stream: fs.WriteStream =
        fs.createWriteStream(outputFileName, { flags: "a" });
    stream.write(dataColumns.join(",") + EOL);
    for await (const rawInfo of courseParser) {
        await wait();
        logger.info("Start processing course", {
            year: rawInfo.year,
            quarter: rawInfo.quarter,
            courseCode: rawInfo.courseCode
        });
        let info: Grade | null = await updateInformation(rawInfo);
        if (info !== null) {
            stream.write(stringify([info]));
            logger.info("Finish processing course", {
                year: rawInfo.year,
                quarter: rawInfo.quarter,
                courseCode: rawInfo.courseCode
            });
        }
    }
    stream.end();
}

/**
 * The entry point of this program.
 */
async function sanitizeData(): Promise<void> {
    fs
        .readdirSync(path.resolve(`${__dirname}/inputData`))
        .forEach(async (file: string) =>
            await processFile(path.resolve(`${__dirname}/inputData/${file}`))
        );
}

sanitizeData()
    .catch((error: any) => logger.error(
        error.message,
        { trace: error.stack }
    ));
