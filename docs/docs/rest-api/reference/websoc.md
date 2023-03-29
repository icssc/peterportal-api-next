---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# WebSoC

The WebSoC (Web Schedule of Classes) endpoint allows programmatic access to the UCI Schedule of Classes.

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
curl "https://api-next.peterportal.org/v1/rest/websoc?year=2023&quarter=Spring&sectionCodes=34270"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

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
          "courseNumberRangeComments": [],
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
                      "days": "MWF",
                      "time": "10:00-10:50 ",
                      "bldg": ["ALP 2300"]
                    }
                  ],
                  "finalExam": "Mon Jun 12 10:30-12:30pm",
                  "maxCapacity": "250",
                  "numCurrentlyEnrolled": {
                    "totalEnrolled": "168",
                    "sectionEnrolled": "166"
                  },
                  "numOnWaitlist": "0",
                  "numWaitlistCap": "38",
                  "numRequested": "191",
                  "numNewOnlyReserved": "0",
                  "restrictions": "J",
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
          meetings: {
            days: string;
            time: string;
            bldg: string[];
          }[];
          finalExam: string;
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
