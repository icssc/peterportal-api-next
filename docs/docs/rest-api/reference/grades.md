---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Grades

<span style={{ color: "var(--ifm-color-primary-lightest)" }}>

<h2>Use the REST API to get information on past grade statistics.</h2>
</span>

## Get raw grade statistics for certain sections

:::info

This endpoint is not currently available; as such, the documentation outlined below is subject to change.

:::

### Query parameters

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
    "department": "I&C SCI",
    "courseNumber": "46",
    "sectionCode": "35730",
    "instructors": ["SHINDLER, M."],
    "gradeACount": 34,
    "gradeBCount": 19,
    "gradeCCount": 40,
    "gradeDCount": 0,
    "gradeFCount": 18,
    "gradePCount": 3,
    "gradeNPCount": 5,
    "gradeWCount": 4,
    "averageGPA": 2.45
  }
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
type payload = {
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

## Get aggregate grade statistics for given sections

:::info

This endpoint is not currently available; as such, the documentation outlined below is subject to change.

:::

### Query parameters

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

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/grades/aggregate?year=2022&quarter=Fall&sectionCode=35730"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

WIP

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
type payload = {
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
