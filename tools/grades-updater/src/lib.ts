import { dirname } from "path";
import { fileURLToPath } from "url";

import type { Quarter } from "@peterportal-api/types";
import winston from "winston";
import type { Logger } from "winston";
import type Transport from "winston-transport";

export interface Grade {
  year: string;
  quarter: Quarter;
  department: string;
  courseNumber: string;
  courseCode: number;
  instructors: string;
  a: number;
  b: number;
  c: number;
  d: number;
  f: number;
  p: number;
  np: number;
  w: number;
  gpaAvg: number;
}

const __dirname: string = dirname(fileURLToPath(import.meta.url));

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
  "gpaAvg",
];

/**
 * Create a logger object that will output information to the console
 * as well as a file under /logs.
 * @returns A logger that writes the current status of the program to
 * the console and a log file.
 */
function createLogger(): Logger {
  const transports: Transport[] = [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${__dirname}/../logs/${Date.now()}.log`,
    }),
  ];
  return winston.createLogger({
    exceptionHandlers: transports,
    format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
    rejectionHandlers: transports,
    transports,
  });
}

const logger: Logger = createLogger();

/**
 * If an error is thrown, catch it by printing its information.
 * @param error Anything after the throw statement.
 */
function handleError(error: unknown): void {
  if (error instanceof Error) {
    logger.error("Error encountered", { trace: error.stack });
  } else {
    logger.error(error);
  }
}

export { __dirname, dataColumns, handleError, logger };
