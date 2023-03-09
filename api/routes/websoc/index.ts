import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import type { IRequest } from "api-core";
import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  logger,
} from "api-core";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import type { SortKey } from "ddb";
import { DDBDocClient } from "ddb";
import hash from "object-hash";
import type {
  Quarter,
  Term,
  WebsocAPIResponse,
} from "peterportal-api-next-types";
import type { WebsocAPIOptions } from "websoc-api-next";
import { callWebSocAPI } from "websoc-api-next";
import type { ZodError } from "zod";

import { QuerySchema } from "./websoc.dto";
import { combineResponses } from "./websoc.service";

/**
 * Given a string of comma-separated values or an array of such strings,
 * return a sorted array containing all unique values.
 * @param val The value to normalize.
 */
const normalizeValue = (val: string | string[] | undefined): string[] =>
  Array.from(
    new Set(
      typeof val === "undefined"
        ? [""]
        : typeof val === "string"
        ? val.split(",")
        : val.map((x) => x.split(",")).flat()
    )
  ).sort();

/**
 * Given a parsed query string, normalize the query and return it as an array of
 * objects that can be passed directly to ``callWebSocAPI``.
 *
 * For each valid key, an entry is created in the normalized query iff its value
 * is truthy and not equal to ``ANY``.
 *
 * Furthermore, to support batch queries for ``units`` and ``sectionCodes``,
 * additional copies of the normalized query are created for every ``units``
 * argument specified and for every 5 ``sectionCodes`` argument specified.
 * @param query The parsed query string to normalize.
 */
const normalizeQuery = (
  query: Record<string, string | string[] | undefined>
): WebsocAPIOptions[] => {
  const baseQuery: Record<string, string | string[] | unknown> = {};
  for (const key of [
    "ge",
    "department",
    "building",
    "room",
    "division",
    "instructorName",
    "courseTitle",
    "sectionType",
    "startTime",
    "endTime",
    "maxCapacity",
    "fullCourses",
    "cancelledCourses",
  ]) {
    if (query[key] && query[key] !== "ANY") {
      baseQuery[key] = query[key];
    }
  }
  for (const key of ["courseNumber", "days"]) {
    if (query[key] && query[key] !== "ANY") {
      baseQuery[key] = normalizeValue(query[key]).join(",");
    }
  }
  const sectionCodeArray = normalizeValue(query.sectionCodes);
  return normalizeValue(query.units)
    .map((units) => ({ ...baseQuery, units }))
    .map((q) =>
      Array.from(Array(Math.ceil(sectionCodeArray.length / 5)).keys()).map(
        (x) => ({
          ...q,
          sectionCodes: sectionCodeArray.slice(x * 5, (x + 1) * 5).join(","),
        })
      )
    )
    .flat()
    .map((q: Partial<WebsocAPIOptions>) => {
      if (!q.units) delete q["units"];
      if (!q.sectionCodes) delete q["sectionCodes"];
      return q as WebsocAPIOptions;
    });
};

/**
 * Returns the lexicographical ordering of two elements.
 * @param a The left hand side of the comparison.
 * @param b The right hand side of the comparison.
 */
const lexOrd = (a: string, b: string): number => (a === b ? 0 : a > b ? 1 : -1);

/**
 * Dispatches the cache updater lambda.
 * @param lambdaClient The Lambda Client to use for this operation.
 * @param tableName The name of the table in which to store the result.
 * @param term The term to cache.
 * @param query The query to cache.
 */
const dispatchCacheUpdater = (
  lambdaClient: LambdaClient,
  tableName: string,
  term: Term,
  query: WebsocAPIOptions
): void => {
  lambdaClient
    .send(
      new InvokeCommand({
        FunctionName: "peterportal-api-next-websoc-cache-updater",
        InvocationType: InvocationType.Event,
        Payload: JSON.stringify({
          tableName,
          term,
          query,
        }) as unknown as Uint8Array,
      })
    )
    .then(() => {
      // noop
    });
};

/**
 * Sleep for the given number of milliseconds.
 * @param ms How long to sleep for in ms.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deeply sorts the provided response and returns the sorted response.
 *
 * Schools are sorted in lexicographical order of their name, departments are
 * sorted in lexicographical order of their code, courses are sorted in
 * numerical order of their number (with lexicographical tiebreaks),
 * and sections are sorted in numerical order of their code.
 * @param res The response to sort.
 */
const sortResponse = (res: WebsocAPIResponse): WebsocAPIResponse => {
  res.schools.forEach((s) => {
    s.departments.forEach((d) => {
      d.courses.forEach((c) =>
        c.sections.sort(
          (a, b) => parseInt(a.sectionCode) - parseInt(b.sectionCode)
        )
      );
      d.courses.sort((a, b) => {
        const numOrd =
          parseInt(a.courseNumber.replace(/\D/g, "")) -
          parseInt(b.courseNumber.replace(/\D/g, ""));
        return numOrd ? numOrd : lexOrd(a.courseNumber, b.courseNumber);
      });
    });
    s.departments.sort((a, b) => lexOrd(a.deptCode, b.deptCode));
  });
  res.schools.sort((a, b) => lexOrd(a.schoolName, b.schoolName));
  return res;
};

/**
 * Determines whether a specified query is eligible to query the cache twice, if
 * the first query resulted in a cache miss. This is only possible iff the query
 * is of the form of one of the following:
 * - The query has a `department` and a scalar value for `courseNumber`.
 * - The query has a vector value for `sectionCodes`.
 * @param query The query for which to check eligibility.
 */
const isTwiceCacheable = (query: WebsocAPIOptions): boolean =>
  Object.keys(query).every(
    (x) =>
      ![
        "ge",
        "instructorName",
        "building",
        "room",
        "division",
        "courseTitle",
        "sectionType",
        "units",
        "days",
        "startTime",
        "endTime",
        "maxCapacity",
        "fullCourses",
        "cancelledCourses",
      ].includes(x)
  ) &&
  Object.keys(query).filter((x) => ["department", "sectionCodes"].includes(x))
    .length === 1 &&
  !!(
    (query.department &&
      query.courseNumber &&
      !query.courseNumber.includes("-") &&
      !query.courseNumber.includes(",")) ||
    query.sectionCodes?.includes(",")
  );

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const { method, path, query: unparsedQuery, requestId } = request.getParams();
  logger.info(`${method} ${path} ${JSON.stringify(unparsedQuery)}`);
  switch (method) {
    case "GET":
    case "HEAD":
      try {
        const query = QuerySchema.parse(unparsedQuery);
        const term: Term = {
          year: query.year,
          quarter: query.quarter as Quarter,
        };
        let queries: Array<WebsocAPIOptions | undefined> =
          normalizeQuery(query);
        let ret: WebsocAPIResponse = { schools: [] };
        // Determine whether to enable caching for this request.
        if (!query.cache || query.cache !== "false") {
          const docClient = new DDBDocClient();
          const tableName = "peterportal-api-next-websoc-cache";
          const sortKey: SortKey = {
            name: "invalidateBy",
            value: Math.floor(Date.now() / 1000),
            cmp: ">=",
          };
          const lambdaClient = new LambdaClient({});
          // For each normalized query:
          // Check the cache for that query. If hit, merge the result with the
          // result to be returned, set that query to ``undefined``, and go to
          // the next query. Otherwise, dispatch the cache updater.
          for (const [i, q] of Object.entries(queries)) {
            if (!q) continue;
            const requestHash = hash([term, q]);
            try {
              const items = (
                await docClient.query(
                  tableName,
                  { name: "requestHash", value: requestHash },
                  sortKey
                )
              )?.Items;
              if (items?.length) {
                logger.info(`Cache hit (${requestHash}): ${JSON.stringify(q)}`);
                queries[parseInt(i)] = undefined;
                ret = combineResponses(items.slice(-1)[0].data, ret);
                continue;
              } else {
                logger.info(
                  `Cache miss (${requestHash}): ${JSON.stringify(q)}`
                );
                dispatchCacheUpdater(lambdaClient, tableName, term, q);
              }
            } catch (e) {
              logger.warn(
                `Error occurred while querying cache for ${JSON.stringify(
                  q
                )} with hash ${requestHash}`
              );
              logger.warn(`Stack trace: ${e}`);
              continue;
            }
            if (!isTwiceCacheable(q)) continue;
            if (q.department) {
              try {
                const altQuery: WebsocAPIOptions = { department: q.department };
                const requestHash = hash([term, altQuery]);
                const items = (
                  await docClient.query(
                    tableName,
                    {
                      name: "requestHash",
                      value: requestHash,
                    },
                    sortKey
                  )
                )?.Items;
                if (items?.length) {
                  logger.info(
                    `Cache hit (${requestHash}): ${JSON.stringify(q)}`
                  );
                  queries[parseInt(i)] = undefined;
                  const data: WebsocAPIResponse = items.slice(-1)[0].data;
                  data.schools[0].departments[0].courses =
                    data.schools[0].departments[0].courses.filter(
                      (x) => x.courseNumber === q.courseNumber
                    );
                  ret = combineResponses(data, ret);
                } else {
                  logger.info(
                    `Cache miss (${requestHash}): ${JSON.stringify(q)}`
                  );
                  dispatchCacheUpdater(lambdaClient, tableName, term, altQuery);
                }
              } catch (e) {
                logger.warn(
                  `Error occurred while querying cache for ${JSON.stringify(
                    q
                  )} with hash (${requestHash})`
                );
                logger.warn(`Stack trace: ${e}`);
                continue;
              }
            }
            if (q.sectionCodes) {
              const sectionCodes = q.sectionCodes.split(",");
              try {
                const items = await Promise.all(
                  sectionCodes.map((sectionCode) =>
                    docClient
                      .query(
                        tableName,
                        {
                          name: "requestHash",
                          value: hash([
                            term,
                            { sectionCodes: sectionCode } as WebsocAPIOptions,
                          ]),
                        },
                        sortKey
                      )
                      .then((x) => x?.Items)
                  )
                );
                if (items.every((x) => x?.length)) {
                  logger.info(`Cache hit: ${JSON.stringify(q)}`);
                  queries[parseInt(i)] = undefined;
                  ret = combineResponses(
                    ...items.map(
                      (x): WebsocAPIResponse => x?.slice(-1)[0].data
                    ),
                    ret
                  );
                } else {
                  logger.info(`Cache miss: ${JSON.stringify(q)}`);
                  sectionCodes.map((sectionCode) =>
                    dispatchCacheUpdater(lambdaClient, tableName, term, {
                      sectionCodes: sectionCode,
                    })
                  );
                }
              } catch (e) {
                logger.warn(
                  `Error occurred while querying cache for ${JSON.stringify(q)}`
                );
                logger.warn(`Stack trace: ${e}`);
              }
            }
          }
          // Filter out the queries that have been set to ``undefined``,
          // i.e. the ones we have fulfilled through the cache already.
          queries = queries.filter((q) => q);
        }
        // For each remaining query:
        // Collect them into an iterable of ``Promises`` and fire them in parallel.
        // Check if each result fulfilled or rejected; merge the data of each
        // fulfilled response into the final response and remove it from the
        // array of queries. If there are still responses remaining, wait for 1
        // second and repeat the process.
        for (;;) {
          const res = await Promise.allSettled(
            queries.map((options) =>
              options
                ? callWebSocAPI(term, options)
                : new Promise<WebsocAPIResponse>(() => ({ schools: [] }))
            )
          );
          for (const [i, r] of Object.entries(res)) {
            if ("value" in r) {
              logger.info(
                `WebSoc query for ${JSON.stringify(
                  queries[parseInt(i)]
                )} succeeded`
              );
              queries[parseInt(i)] = undefined;
              ret = combineResponses(r.value, ret);
            } else {
              logger.info(
                `WebSoc query for ${JSON.stringify(
                  queries[parseInt(i)]
                )} failed`
              );
            }
          }
          queries = queries.filter((q) => q);
          if (!queries.length) break;
          logger.info(``);
          await sleep(1000);
        }
        // Sort the response and return it.
        return createOKResult(sortResponse(ret), requestId);
      } catch (e) {
        return createErrorResult(
          400,
          (e as ZodError).issues.map((i) => i.message).join("; "),
          requestId
        );
      }
    default:
      return createErrorResult(400, `Cannot ${method} ${path}`, requestId);
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
