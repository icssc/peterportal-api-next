---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Courses

The courses endpoint allows users to get information on courses offered at UCI.

## Get a course with the given course number

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/courses/COMPSCI162"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "id": "COMPSCI162",
  "department": "COMPSCI",
  "courseNumber": "162",
  "courseNumeric": 162,
  "school": "Donald Bren School of Information and Computer Sciences",
  "title": "Formal Languages and Automata",
  "courseLevel": "Upper Division (100-199)",
  "minUnits": 4,
  "maxUnits": 4,
  "description": "Formal aspects of describing and recognizing languages by grammars and automata.  Parsing regular and context-free languages. Ambiguity, nondeterminism. Elements of computability; Turning machines, random access machines, undecidable problems, NP-completeness.",
  "departmentName": "Computer Science",
  "instructorHistory": ["goodrich", "whayes", "mikes", "vazirani"],
  "prerequisiteTree": {
    "AND": [
      "I&C SCI 6B",
      "I&C SCI 6D",
      {
        "OR": ["MATH 2B", "AP CALCULUS BC"]
      },
      {
        "OR": ["CSE 46", "I&C SCI 46"]
      }
    ]
  },
  "prerequisiteList": [
    "I&C SCI 46",
    "CSE 46",
    "MATH 2B",
    "AP CALCULUS BC",
    "I&C SCI 6B",
    "I&C SCI 6D"
  ],
  "prerequisiteText": "(I&C SCI 46 OR CSE 46) AND (MATH 2B OR AP CALCULUS BC) AND I&C SCI 6B AND I&C SCI 6D",
  "prerequisiteFor": [],
  "repeatability": "",
  "gradingOption": "",
  "concurrent": "",
  "sameAs": "LSCI 102.",
  "restriction": "School of Info & Computer Sci students have first consideration for enrollment. Cognitive Sciences Majors have first consideration for enrollment. Language Science Majors have first consideration for enrollment. Computer Science Engineering Majors have first consideration for enrollment.",
  "overlap": "",
  "corequisites": "",
  "geList": [],
  "geText": "",
  "terms": [
    "2023 Spring",
    "2022 Winter",
    "2021 Spring",
    "2020 Spring",
    "2019 Spring",
    "2018 Winter",
    "2017 Winter",
    "2015 Fall",
    "2015 Winter",
    "2014 Winter"
  ]
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/courses.ts
type Course = {
  id: string;
  department: string;
  courseNumber: string;
  courseNumeric: number;
  school: string;
  title: string;
  courseLevel: CourseLevel;
  minUnits: number;
  maxUnits: number;
  description: string;
  departmentName: string;
  instructorHistory: string[];
  prerequisiteTree: PrerequisiteTree;
  prerequisiteList: string[];
  prerequisiteText: string;
  prerequisiteFor: string[];
  repeatability: string;
  gradingOption: string;
  concurrent: string;
  sameAs: string;
  restriction: string;
  overlap: string;
  corequisites: string;
  geList: GECategory[];
  geText: string;
  terms: string[];
};
```

</TabItem>
</Tabs>

## Get courses that match the specified constraints

### Query parameters

#### `department` string

The department the course(s) are in.

#### `courseNumber` string

The course number of the course(s).

#### `courseNumeric` string

The numeric part of the course number of the course(s).

#### `titleContains` string

A substring of the courses' titles.

#### `courseLevel` ANY | LowerDiv | UpperDiv | Graduate

The course level of the courses. Case-sensitive. Defaults to ANY.

#### `minUnits` string

The minimum number of units that can be earned by taking any of the courses.

#### `maxUnits` string

The maximum number of units that can be earned by taking any of the courses.

#### `descriptionContains` string

A substring of the courses' descriptions.

#### `taughtByInstructors` string | string[]

The UCInetID(s) of the instructor(s), one of whom have taught one of the courses.

#### `geCategory` ANY | GE-1A | GE-1B | GE-2 | GE-3 | GE-4 | GE-5A | GE-5B | GE-6 | GE-7 | GE-8

The GE category of the courses. Case-sensitive. Defaults to ANY.

#### `taughtInTerms` string | string[]

The term(s) in which the course(s) were taught.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/courses"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example responses">

<details>
<summary>Get all courses belonging to a department</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?department=COMPSCI"
```

```json
[{ "id": "COMPSCI103", "...": "..." }, "..."]
```

</details>

<details>
<summary>Get all COMPSCI courses with the same numeric part</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?department=COMPSCI&courseNumeric=122"
```

```json
[
  { "id": "COMPSCI122A", "...": "..." },
  { "id": "COMPSCI122B", "...": "..." },
  { "id": "COMPSCI122C", "...": "..." },
  { "id": "COMPSCI122D", "...": "..." }
]
```

</details>

<details>
<summary>Get all graduate COMPSCI courses</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?department=COMPSCI&courseLevel=Graduate"
```

```json
[{ "id": "COMPSCI200S", "...": "..." }, "..."]
```

</details>

<details>
<summary>Get all courses taught by mikes and/or eppstein</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?taughtByInstructors=mikes,eppstein"
```

```json
[
  {
    "id": "COMPSCI161",
    "foo": "...",
    "instructorHistory": ["...", "eppstein", "...", "mikes", "..."],
    "bar": "..."
  },
  {
    "id": "COMPSCI162",
    "foo": "...",
    "instructorHistory": ["...", "mikes", "..."],
    "bar": "..."
  },
  {
    "id": "COMPSCI163",
    "foo": "...",
    "instructorHistory": ["...", "eppstein", "..."],
    "bar": "..."
  }
]
```

</details>

<details>
<summary>Get all GE-2 courses</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?geCategory=GE-2"
```

```json
[{ "id": "ARTHIS55", "...": "..." }, "..."]
```

</details>

<details>
<summary>Get all COMPSCI upper division courses that were taught in 2023 Spring or 2023 Winter</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?department=COMPSCI&courseLevel=UpperDiv&taughtInTerms=2023%20Spring,2023%20Winter"
```

```json
[
  { "id": "COMPSCI111", "...": "...", "terms": ["2023 Spring", "..."] },
  "...",
  { "id": "COMPSCI116", "...": "...", "terms": ["2023 Winter", "..."] },
  "...",
  { "id": "COMPSCI121", "...": "...", "terms": ["2023 Spring", "2023 Winter", "..."] }
]
```

</details>

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/courses.ts
type CourseResponse = Course[];
```

</TabItem>
</Tabs>

## Get all courses

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/courses/all"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "id": "ACENG139W",
    "...": "..."
  },
  {
    "id": "ACENG200",
    "...": "..."
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/courses.ts
type CourseResponse = Course[];
```

</TabItem>
</Tabs>
