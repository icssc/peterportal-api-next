---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# WebSOC

<span style={{ color: "var(--ifm-color-primary-lightest)" }}>

<h2>Use the REST API to get information from WebSOC.</h2>
</span>

## Query the Schedule of Classes

### Query parameters

#### `year` string <span style={{ color: "#ff86b4" }}>Required</span>

The year to query.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2 <span style={{ color: "#ff86b4" }}>Required</span>

The quarter to query. Case-sensitive.

#### `ge`**\*** GE-1A | GE-1B | GE-2 | GE-3 | GE-4 | GE-5A | GE-5B | GE-6 | GE-7 | GE-8

The GE category code. Case-sensitive.

#### `department`**\*** string

The department code.

#### `sectionCodes`**\*** string | string[]

The five-digit section code(s).

#### `instructorName`**\*** string

Any substring of the desired instructor's last name. To search an exact last
name, append a comma to the parameter.

At least one of the parameters marked with **\*** must be provided.

#### `building` string

The building code.

#### `room` string

The room number.

If the room number is provided, the building code must be provided.

#### `division` LowerDiv | UpperDiv | Graduate

The course level/division code. Case-sensitive.

#### `courseNumber` string

The course number. (Ex.: 161)

#### `courseTitle` string

Any substring of the course title.

#### `sectionType` Act | Col | Dis | Fld | Lab | Lec | Qiz | Res | Sem | Stu | Tap | Tut

The section type code. Case-sensitive.

#### `units` string | string[]

The number of units approved for the section, or the string `VAR` for any
section with variable units.

#### `days` string | string[]

The day(s) that a section meets on. (Ex.: `MWF`)

#### `startTime` string

The time on or after which a section starts.

#### `endTime` string

The time by which a section ends.

#### `maxCapacity` string

The maximum capacity of a section. (Ex.: `>200`, `<21`, `=69`)

#### `fullCourses` SkipFull | SkipFullWaitlist | FullOnly | OverEnrolled

Which sections to exclude based on their enrollment status. Case-sensitive.

#### `cancelledCourses` Exclude | Include | Only

Which sections to exclude based on their cancellation status. Case-sensitive.

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
type payload = {
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

## Get all available departments

:::info

This endpoint is not currently available; as such, the documentation outlined below is subject to change.

:::

### Query parameters

None.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc/departments"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example payload">

```json
[
  {
    "deptLabel": "ALL: Include All Departments",
    "deptValue": "ALL"
  },
  "...",
  {
    "deptLabel": "I&C SCI: Information and Computer Science",
    "deptValue": "I&C SCI"
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
type payload = { deptLabel: string; deptValue: string }[];
```

</TabItem>
</Tabs>

## Get all available terms

:::info

This endpoint is not currently available; as such, the documentation outlined below is subject to change.

:::

### Query parameters

None.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/websoc/terms"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example payload">

```json
[
  {
    "shortName": "2023 Summer2",
    "longName": "2023 Summer Session 2"
  },
  "...",
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
type payload = { shortName: string; longName: string }[];
```

</TabItem>
</Tabs>
