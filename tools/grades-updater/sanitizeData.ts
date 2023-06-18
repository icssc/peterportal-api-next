import fs from 'fs'
import { EOL } from 'os'
import { basename, resolve } from 'path'
import { callWebSocAPI } from '@libs/websoc-api-next'
import type { CastingContext, Parser } from 'csv-parse'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify/sync'
import type { Quarter, WebsocAPIResponse, WebsocSection } from 'peterportal-api-next-types'

import { __dirname, dataColumns, type Grade, handleError, logger } from './gradesUpdaterUtil'

export interface RawGrade {
  year: string
  quarter: 'Fall' | 'Winter' | 'Spring' | 'Summer'
  department: string
  courseNumber: string
  courseCode: number
  instructors: null
  a: number
  b: number
  c: number
  d: number
  f: number
  p: number
  np: number
  w: number
  gpaAvg: number
}

const summerQuarters: Quarter[] = ['Summer1', 'Summer10wk', 'Summer2']

/**
 * Pause an executing async function for some time.
 * @param min An integer for the minimum millisecond to pause the execution.
 * It must be less than or equal to max and greater than zero.
 * @param max An integer for the maximum millisecond to pause the execution.
 * It must be greater than or equal to min and greater than zero.
 * @returns A promise calling setTimeout().
 */
async function wait(min: number, max: number): Promise<void> {
  if (min < 0 || max < 0 || max < min) {
    throw new RangeError("Please follow wait()'s function signature.")
  }
  const time: number = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve: (value: void) => void) => setTimeout(resolve, time))
}

/**
 * Return course information on WebSOC. Before sending each request,
 * it will wait two to six seconds.
 * @param year The academic year for the course in the format "XXXX-XX."
 * @param quarters An array of strings. Takes ["Fall"], ["Winter"],
 * ["Spring"], or ["Summer1", "Summer10wk", "Summer2"].
 * @param courseCode The course code, ranging from 1 to 99999, for the class.
 * @returns An array containing the promises for making requests to WebSOC.
 */
async function getInfo(
  year: string,
  quarters: Quarter[],
  courseCode: number
): Promise<WebsocAPIResponse[]> {
  const promises: Promise<WebsocAPIResponse>[] = []
  for (const quarter of quarters) {
    if (quarter.startsWith('Summer')) {
      await wait(2500, 4500)
    } else {
      await wait(2000, 6000)
    }

    promises.push(
      callWebSocAPI(
        {
          year,
          quarter,
        },
        {
          department: 'ANY',
          sectionCodes: `${courseCode}`,
        }
      )
    )
  }
  return Promise.all(promises)
}

/**
 * Return a string for the academic year of the course.
 * @param year The academic year for the course in the format "XXXX-XX."
 * @param quarter Either "Summer", "Fall", "Winter", or "Spring."
 * @returns The academic year in the format of "XXXX."
 */
function parseYear(year: string, quarter: 'Fall' | 'Winter' | 'Spring' | 'Summer'): string {
  return ['Summer', 'Fall'].includes(quarter)
    ? year.substring(0, 4)
    : `${parseInt(year.substring(0, 4)) + 1}`
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
    info.quarter === 'Summer' ? summerQuarters : [info.quarter],
    info.courseCode
  )
  for (let index = 0; index < responses.length; ++index) {
    if (
      responses[index].schools.length > 0 &&
      responses[index].schools[0].departments.length > 0 &&
      responses[index].schools[0].departments[0].courses.length > 0 &&
      responses[index].schools[0].departments[0].courses[0].sections.length > 0
    ) {
      const section: WebsocSection =
        responses[index].schools[0].departments[0].courses[0].sections[0]
      if (parseInt(section.sectionCode) === info.courseCode) {
        return {
          ...info,
          quarter: info.quarter !== 'Summer' ? info.quarter : summerQuarters[index],
          department: responses[index].schools[0].departments[0].courses[0].deptCode,
          courseNumber: responses[index].schools[0].departments[0].courses[0].courseNumber,
          instructors: section.instructors
            .filter((instructor: string) => instructor !== 'STAFF')
            .join('; '),
        }
      }
    }
  }
  return null
}

/**
 * Create a CSV parser to read the content from the file.
 * @param filePath The absolute path to the input CSV file.
 * @returns A parser to extract the information in the CSV file.
 */
function createParser(filePath: string): Parser {
  return fs.createReadStream(filePath).pipe(
    parse({
      cast: (value: string, context: CastingContext) => {
        switch (context.column) {
          case 'year':
          case 'quarter':
          case 'department':
          case 'courseNumber':
            return value
          case 'courseCode':
          case 'a':
          case 'b':
          case 'c':
          case 'd':
          case 'f':
          case 'p':
          case 'np':
          case 'w':
            return parseInt(value || '0')
          case 'instructors':
            return null
          case 'gpaAvg':
            return parseFloat(value || '0')
          default:
            throw new SyntaxError(`Unknown entry: ${context.column}=${value}`)
        }
      },
      columns: dataColumns,
      from_line: 2,
      skip_empty_lines: true,
      trim: true,
    })
  )
}

/**
 * Take the CSV file under /inputData, extract the information as JSON
 * objects, and write the updated info to a file under /outputData.
 * @param filePath The absolute path to the input CSV file.
 */
async function processFile(filePath: string): Promise<void> {
  const courseParser: Parser = createParser(filePath)
  const outputFilePath: string = resolve(
    `${__dirname}/outputData/${basename(filePath, '.csv')}.output.csv`
  )
  const stream: fs.WriteStream = fs.createWriteStream(outputFilePath, {
    flags: 'a',
  })

  stream.write(dataColumns.join(',') + EOL)
  for await (const rawInfo of courseParser) {
    logger.info('Started processing course', {
      year: rawInfo.year,
      quarter: rawInfo.quarter,
      courseCode: rawInfo.courseCode,
    })
    const info: Grade | null = await updateInformation(rawInfo)
    if (info !== null) {
      if (stream.write(stringify([info])) === false) {
        stream.once('drain', () => ({}))
      }
      logger.info('Finished processing course', info)
    } else {
      logger.warn('No matching course found', {
        year: rawInfo.year,
        quarter: rawInfo.quarter,
        courseCode: rawInfo.courseCode,
      })
    }
  }
  stream.end()
}

/**
 * The entry point of this program.
 */
async function sanitizeData(): Promise<void> {
  if (
    fs.existsSync(`${__dirname}/inputData`) === false ||
    fs.existsSync(`${__dirname}/outputData`) === false
  ) {
    throw new Error('Please create /inputData and /outputData first')
  }
  await Promise.all(
    fs
      .readdirSync(resolve(`${__dirname}/inputData`))
      .map((file: string) => processFile(resolve(`${__dirname}/inputData/${file}`)))
  )
}

sanitizeData().catch(handleError)
