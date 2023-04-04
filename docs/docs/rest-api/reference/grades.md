---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Grades

PeterPortal API maintains a database of past grades dating back to 2014 Summer Session 1. This database is updated from the [Public Records Office](https://pro.uci.edu/) as soon as they are available. This endpoint allows users to query that database with any desired filters.

Please note that due to the size of the database, not providing any filters for the grades statistics endpoints will most likely result in an error. If you must fetch all data from the database at once, please consider doing so by year.

## Query parameters for all endpoints

#### `year` string

The year to include.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2

The quarter to include. Case-sensitive.

#### `instructor` string

The shortened name of the instructor to include. (Ex.: SHINDLER, M.)

#### `department` string

The department to include.

#### `courseNumber` string

The course number to include. (Ex.: 161)

#### `sectionCode` string

The five-digit section code to include.

#### `division` LowerDiv | UpperDiv | Graduate

The course level/division code to include. Case-sensitive.

#### `excludePNP` boolean

Whether to exclude sections that only reported Pass/No-Pass grades.

## Get raw grade statistics for certain sections

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/grades/raw?year=2022&quarter=Fall&sectionCode=35730"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "year": "2022",
    "quarter": "Fall",
    "sectionCode": "35730",
    "department": "I&C SCI",
    "courseNumber": "46",
    "courseNumeric": 46,
    "gradeACount": 34,
    "gradeBCount": 19,
    "gradeCCount": 40,
    "gradeDCount": 0,
    "gradeFCount": 18,
    "gradePCount": 3,
    "gradeNPCount": 5,
    "gradeWCount": 4,
    "averageGPA": 2.45,
    "instructors": ["GARZA RODRIGUE, A.", "GILA, O.", "SHINDLER, M."]
  }
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/grades.ts
type GradesRaw = {
  year: string;
  quarter: string;
  department: string;
  courseNumber: string;
  sectionCode: string;
  instructors: string[];
  gradeACount: number;
  gradeBCount: number;
  gradeCCount: number;
  gradeDCount: number;
  gradeFCount: number;
  gradePCount: number;
  gradeNPCount: number;
  gradeWCount: number;
  averageGPA: number;
}[];
```

</TabItem>
</Tabs>

## Get aggregate grade statistics for certain sections

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/grades/aggregate?year=2022&quarter=Fall&courseNumber=46"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "sectionList": [
    {
      "year": "2022",
      "quarter": "Fall",
      "sectionCode": "35730",
      "department": "I&C SCI",
      "courseNumber": "46",
      "courseNumeric": 46,
      "instructors": ["GARZA RODRIGUE, A.", "GILA, O.", "SHINDLER, M."]
    },
    {
      "year": "2022",
      "quarter": "Fall",
      "sectionCode": "35740",
      "department": "I&C SCI",
      "courseNumber": "46",
      "courseNumeric": 46,
      "instructors": ["DICKERSON, M.", "SHINDLER, M."]
    }
  ],
  "gradeDistribution": {
    "gradeACount": 95,
    "gradeBCount": 83,
    "gradeCCount": 103,
    "gradeDCount": 0,
    "gradeFCount": 33,
    "gradePCount": 4,
    "gradeNPCount": 7,
    "gradeWCount": 10,
    "averageGPA": 2.63
  }
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/grades.ts
type GradesAggregate = {
  sectionList: {
    year: string;
    quarter: string;
    department: string;
    courseNumber: string;
    sectionCode: string;
    instructors: string[];
  }[];
  gradeDistribution: {
    gradeACount: number;
    gradeBCount: number;
    gradeCCount: number;
    gradeDCount: number;
    gradeFCount: number;
    gradePCount: number;
    gradeNPCount: number;
    gradeWCount: number;
    averageGPA: number;
  };
};
```

</TabItem>
</Tabs>

## Get lists of valid options for the given filters

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/grades/options?department=COMPSCI"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "years": [
    "2022",
    "2021",
    "2020",
    "2019",
    "2018",
    "2017",
    "2016",
    "2015",
    "2014"
  ],
  "departments": ["COMPSCI"],
  "courseNumbers": [
    "103",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "..."
  ],
  "sectionCodes": [
    "34000",
    "34010",
    "34015",
    "34020",
    "34030",
    "34035",
    "34040",
    "34050",
    "34055",
    "34060",
    "..."
  ],
  "instructors": [
    "ABBASPOUR TEHR, M.",
    "ABDU JYOTHI, S.",
    "ABRAHAM, D.",
    "ADDANKI, G.",
    "ADHIKARI, A.",
    "AGARWAL, N.",
    "AGNIHOTRI, M.",
    "AHMED, I.",
    "AL SUDAIS, S.",
    "..."
  ]
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/grades.ts
type GradesOptions = {
  years: string[];
  departments: string[];
  courseNumbers: string[];
  sectionCodes: string[];
  instructors: string[];
};
```

</TabItem>
</Tabs>
