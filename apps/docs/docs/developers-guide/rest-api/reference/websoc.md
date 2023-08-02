---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# WebSoc

The WebSoc (Web Schedule of Classes) endpoint allows programmatic access to the UCI Schedule of Classes.

PeterPortal API maintains a cache of all WebSoc data, which is updated every hour. By default, the endpoint will return data from the cache if it can, falling back to WebSoc on a cache miss. This improves the overall response time, but may result in stale data.

## Query the Schedule of Classes

### Query parameters

#### `year` string <span style={{ color: "#ff86b4" }}>Required</span>

The year to query.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2 <span style={{ color: "#ff86b4" }}>Required</span>

The quarter to query. Case-sensitive.

#### `cache` boolean

Whether to query the cache at all; defaults to `true`. If this is set to `false`, then the endpoint will query WebSoc directly instead. Note that disabling the cache for large queries may result in a timeout.

#### `cacheOnly` boolean

Whether to use the cache exclusively; defaults to `false`. If this is set to `true`, then none of the following parameters marked with **\*** are required, but cache misses will not result in a fallback query.

#### `includeCoCourses` boolean

When querying by GE categories, the default behavior of WebSoc is to return only the main section of the course that satisfies the desired GE category. Setting this flag to `true` also returns any co-courses (discussions, labs, etc.) associated with the main section, but requires `cacheOnly` to also be set to `true`.

To preserve backwards compatibility with WebSoc, this defaults to `false`.

#### `ge`**\*** ANY | GE-1A | GE-1B | GE-2 | GE-3 | GE-4 | GE-5A | GE-5B | GE-6 | GE-7 | GE-8

The GE category code. Case-sensitive. Defaults to ANY.

#### `department`**\*** string

The department code.

#### `sectionCodes`**\*** string | string[]

The five-digit section code(s).

#### `instructorName`**\*** string

Any substring of the desired instructor's last name. To search an exact last
name, append a comma to the parameter.

If `cacheOnly` is `false`, at least one of the parameters marked with **\*** must be provided and must not be ANY.

#### `building` string

The building code.

#### `room` string

The room number.

If the room number is provided, the building code must be provided.

#### `division` ANY | LowerDiv | UpperDiv | Graduate

The course level/division code. Case-sensitive. Defaults to ANY.

#### `courseNumber` string | string[]

The course number(s) and/or range(s). (Ex.: 122A, 160-169)

#### `courseTitle` string

Any substring of the course title.

#### `sectionType` ANY | Act | Col | Dis | Fld | Lab | Lec | Qiz | Res | Sem | Stu | Tap | Tut

The section type code. Case-sensitive. Defaults to ANY.

#### `units` string | string[]

The number(s) of units approved for the section and/or the string `VAR` for any
section with variable units.

#### `days` string | string[]

The day(s) that a section meets on. (Ex.: `MWF`)

#### `startTime` string

The time on or after which a section starts.

#### `endTime` string

The time by which a section ends.

#### `maxCapacity` string

The maximum capacity of a section. (Ex.: `>200`, `<21`, `=69`)

#### `fullCourses` ANY | SkipFull | SkipFullWaitlist | FullOnly | OverEnrolled

Which sections to exclude based on their enrollment status. Case-sensitive. Defaults to ANY.

#### `cancelledCourses` Exclude | Include | Only

Which sections to exclude based on their cancellation status. Case-sensitive. Defaults to Exclude.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example responses">

<details>
<summary>Section with no final exam</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc?year=2023&quarter=Spring&sectionCodes=34271"
```

```json
{
  "schools": [
    {
      "schoolName": "Donald Bren School of Information and Computer Sciences",
      "schoolComment": "...",
      "departments": [
        {
          "deptComment": "...",
          "sectionCodeRangeComments": [],
          "courseNumberRangeComments": ["..."],
          "deptCode": "COMPSCI",
          "deptName": "Computer Science",
          "courses": [
            {
              "deptCode": "COMPSCI",
              "courseComment": "",
              "prerequisiteLink": "https://www.reg.uci.edu/cob/prrqcgi?term=202314&dept=COMPSCI&action=view_by_term#162",
              "courseNumber": "162",
              "courseTitle": "FORMAL LANG & AUTM",
              "sections": [
                {
                  "sectionCode": "34271",
                  "sectionType": "Dis",
                  "sectionNum": "A",
                  "units": "0",
                  "instructors": ["DEES, M.", "CHIU, A.", "SHINDLER, M."],
                  "meetings": [
                    {
                      "bldg": ["SSH 100"],
                      "timeIsTBA": false,
                      "days": "Tu",
                      "startTime": {
                        "hour": 19,
                        "minute": 0
                      },
                      "endTime": {
                        "hour": 19,
                        "minute": 50
                      }
                    }
                  ],
                  "finalExam": {
                    "examStatus": "N/A"
                  },
                  "maxCapacity": "249",
                  "numCurrentlyEnrolled": {
                    "totalEnrolled": "170",
                    "sectionEnrolled": "169"
                  },
                  "numOnWaitlist": "",
                  "numWaitlistCap": "",
                  "numRequested": "219",
                  "numNewOnlyReserved": "",
                  "restrictions": "A",
                  "status": "OPEN",
                  "sectionComment": "\n\t\t\t    <p>Same as 65131 (LSCI 102, Dis A).</p>\n\t\t\t    "
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

</details>

<details>
<summary>Section with TBA meeting time and final exam</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc?year=2023&quarter=Spring&sectionCodes=34160"
```

```json
{
  "schools": [
    {
      "schoolName": "Donald Bren School of Information and Computer Sciences",
      "schoolComment": "...",
      "departments": [
        {
          "deptComment": "...",
          "sectionCodeRangeComments": [],
          "courseNumberRangeComments": ["..."],
          "deptCode": "COMPSCI",
          "deptName": "Computer Science",
          "courses": [
            {
              "deptCode": "COMPSCI",
              "courseComment": "",
              "prerequisiteLink": "https://www.reg.uci.edu/cob/prrqcgi?term=202314&dept=COMPSCI&action=view_by_term#143A",
              "courseNumber": "143A",
              "courseTitle": "PRNCPLS OPERTNG SYS",
              "sections": [
                {
                  "sectionCode": "34160",
                  "sectionType": "Lec",
                  "sectionNum": "A",
                  "units": "4",
                  "instructors": ["BIC, L.", "GIYAHCHI, T.", "YI, S."],
                  "meetings": [
                    {
                      "bldg": ["ON LINE"],
                      "timeIsTBA": true
                    }
                  ],
                  "finalExam": {
                    "examStatus": "TBA"
                  },
                  "maxCapacity": "125",
                  "numCurrentlyEnrolled": {
                    "totalEnrolled": "124",
                    "sectionEnrolled": ""
                  },
                  "numOnWaitlist": "",
                  "numWaitlistCap": "",
                  "numRequested": "186",
                  "numNewOnlyReserved": "",
                  "restrictions": "A",
                  "status": "OPEN",
                  "sectionComment": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

</details>

<details>
<summary>Section with a final exam held in the same location as the lecture</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc?year=2023&quarter=Spring&sectionCodes=34270"
```

```json
{
  "schools": [
    {
      "schoolName": "Donald Bren School of Information and Computer Sciences",
      "schoolComment": "...",
      "departments": [
        {
          "deptComment": "...",
          "sectionCodeRangeComments": [],
          "courseNumberRangeComments": ["..."],
          "deptCode": "COMPSCI",
          "deptName": "Computer Science",
          "courses": [
            {
              "deptCode": "COMPSCI",
              "courseComment": "",
              "prerequisiteLink": "https://www.reg.uci.edu/cob/prrqcgi?term=202314&dept=COMPSCI&action=view_by_term#162",
              "courseNumber": "162",
              "courseTitle": "FORMAL LANG & AUTM",
              "sections": [
                {
                  "sectionCode": "34270",
                  "sectionType": "Lec",
                  "sectionNum": "A",
                  "units": "4",
                  "instructors": ["SHINDLER, M."],
                  "meetings": [
                    {
                      "bldg": ["ALP 2300"],
                      "timeIsTBA": false,
                      "days": "MWF",
                      "startTime": {
                        "hour": 10,
                        "minute": 0
                      },
                      "endTime": {
                        "hour": 10,
                        "minute": 50
                      }
                    }
                  ],
                  "finalExam": {
                    "examStatus": "Present",
                    "month": 6,
                    "day": 12,
                    "startTime": {
                      "hour": 10,
                      "minute": 30
                    },
                    "endTime": {
                      "hour": 12,
                      "minute": 30
                    },
                    "bldg": ["ALP 2300"]
                  },
                  "maxCapacity": "249",
                  "numCurrentlyEnrolled": {
                    "totalEnrolled": "170",
                    "sectionEnrolled": "169"
                  },
                  "numOnWaitlist": "",
                  "numWaitlistCap": "",
                  "numRequested": "246",
                  "numNewOnlyReserved": "",
                  "restrictions": "A",
                  "status": "OPEN",
                  "sectionComment": "\n\t\t\t    <p>Same as 65130 (LSCI 102, Lec A).</p>\n\t\t\t    "
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

</details>

<details>
<summary>Section with multiple meetings and final exam held in a different location</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc?year=2023&quarter=Spring&sectionCodes=44100"
```

```json
{
  "schools": [
    {
      "schoolName": "School of Physical Sciences",
      "schoolComment": "...",
      "departments": [
        {
          "deptComment": "...",
          "sectionCodeRangeComments": [],
          "courseNumberRangeComments": [],
          "deptCode": "MATH",
          "deptName": "Mathematics",
          "courses": [
            {
              "deptCode": "MATH",
              "courseComment": "...",
              "prerequisiteLink": "https://www.reg.uci.edu/cob/prrqcgi?term=202314&dept=MATH&action=view_by_term#2B",
              "courseNumber": "2B",
              "courseTitle": "CALCULUS II",
              "sections": [
                {
                  "sectionCode": "44100",
                  "sectionType": "Lec",
                  "sectionNum": "A",
                  "units": "4",
                  "instructors": ["LEHMAN, R."],
                  "meetings": [
                    {
                      "bldg": ["ON LINE"],
                      "timeIsTBA": false,
                      "days": "MF",
                      "startTime": {
                        "hour": 10,
                        "minute": 0
                      },
                      "endTime": {
                        "hour": 10,
                        "minute": 50
                      }
                    },
                    {
                      "bldg": ["ALP 1300"],
                      "timeIsTBA": false,
                      "days": "W",
                      "startTime": {
                        "hour": 10,
                        "minute": 0
                      },
                      "endTime": {
                        "hour": 10,
                        "minute": 50
                      }
                    }
                  ],
                  "finalExam": {
                    "examStatus": "Present",
                    "month": 6,
                    "day": 10,
                    "startTime": {
                      "hour": 13,
                      "minute": 30
                    },
                    "endTime": {
                      "hour": 15,
                      "minute": 30
                    },
                    "bldg": "ALP 1300"
                  },
                  "maxCapacity": "295",
                  "numCurrentlyEnrolled": {
                    "totalEnrolled": "271",
                    "sectionEnrolled": ""
                  },
                  "numOnWaitlist": "",
                  "numWaitlistCap": "",
                  "numRequested": "442",
                  "numNewOnlyReserved": "",
                  "restrictions": "A",
                  "status": "OPEN",
                  "sectionComment": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

</details>

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/websoc.ts
type WebsocAPIResponse = {
  schools: {
    schoolName: string;
    schoolComment: string;
    departments: {
      deptName: string;
      deptCode: string;
      deptComment: string;
      courses: {
        deptCode: string;
        courseNumber: string;
        courseTitle: string;
        courseComment: string;
        prerequisiteLink: string;
        sections: {
          sectionCode: string;
          sectionType: string;
          sectionNum: string;
          units: string;
          instructors: string[];
          meetings: Array<
            | {
                bldg: string[];
                timeIsTBA: true;
              }
            | {
                bldg: string[];
                timeIsTBA: false;
                days: string;
                startTime: {
                  hour: number;
                  minute: number;
                };
                endTime: {
                  hour: number;
                  minute: number;
                };
              }
          >;
          finalExam:
            | { examStatus: "N/A" | "TBA" }
            | {
                examStatus: "Present";
                month: number;
                day: number;
                startTime: {
                  hour: number;
                  minute: number;
                };
                endTime: {
                  hour: number;
                  minute: number;
                };
                bldg: string;
              };
          maxCapacity: string;
          numCurrentlyEnrolled: {
            totalEnrolled: string;
            sectionEnrolled: string;
          };
          numOnWaitlist: string;
          numWaitlistCap: string;
          numRequested: string;
          numNewOnlyReserved: string;
          restrictions: string;
          status: "OPEN" | "Waitl" | "FULL" | "NewOnly";
          sectionComment: string;
        }[];
      }[];
      sectionCodeRangeComments: string[];
      courseNumberRangeComments: string[];
    }[];
  }[];
};
```

</TabItem>
</Tabs>

## Get a list of available departments

### Query parameters

None.

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "deptLabel": "ALL: Include All Departments",
    "deptValue": "ALL"
  },
  {
    "deptLabel": "AC ENG: Academic English",
    "deptValue": "AC ENG"
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/websoc.ts
type DepartmentList = {
  deptLabel: string;
  deptValue: string;
}[];
```

</TabItem>
</Tabs>

## Get a list of available departments

### Query parameters

None.

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "shortName": "2023 Summer2",
    "longName": "2023 Summer Session 2"
  },
  {
    "shortName": "2023 Summer10wk",
    "longName": "2023 10-wk Summer"
  },
  {
    "shortName": "2023 Summer1",
    "longName": "2023 Summer Session 1"
  },
  {
    "shortName": "2023 Spring",
    "longName": "2023 Spring Quarter"
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/websoc.ts
type TermList = {
  shortName: `${string} ${Quarter}`;
  longName: string;
}[];
```

</TabItem>
</Tabs>
