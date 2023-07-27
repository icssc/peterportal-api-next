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
