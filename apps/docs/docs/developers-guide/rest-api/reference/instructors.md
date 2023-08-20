---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Instructors

The instructors endpoint allows users to get information on instructors who currently teach (or have taught) at UCI. This endpoint should include data on lecturers and professors, but most likely not graduate students in teaching roles, since information for the latter is not available through the General Catalogue.

## Get an instructor with the given UCInetID

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors/mikes"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "ucinetid": "mikes",
  "name": "Michael Shindler",
  "shortenedName": "SHINDLER, M.",
  "title": "Associate Professor of Teaching",
  "email": "mikes@uci.edu",
  "department": "Computer Science",
  "schools": ["Donald Bren School of Information and Computer Sciences"],
  "relatedDepartments": ["COMPSCI", "IN4MATX", "I&C SCI", "SWE", "STATS"],
  "courseHistory": {
    "COMPSCI 162": ["2023 Spring", "2021 Spring", "2020 Spring"],
    "I&C SCI 193": ["2023 Spring"],
    "...": "..."
  }
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/instructors.ts
type Instructor = {
  ucinetid: string;
  name: string;
  shortenedName: string;
  title: string;
  email: string;
  department: string;
  schools: string[];
  relatedDepartments: string[];
  courseHistory: Record<string, string[]>;
};
```

</TabItem>
</Tabs>

## Get courses that match the specified constraints

### Query parameters

#### `nameContains` string

A substring of the instructors' names.

#### `shortenedName` string

The shortened name (i.e. WebSoc name) of the instructor(s).

:::caution

Using this parameter will typically only return one entry; however, in some cases, multiple instructors may share the same shortened name. This may be because one or more of the instructors are emeriti, or because the last name-first initial combo is too common. Be sure to double-check the response.

:::

#### `titleContains` string

A substring of the instructors' titles.

#### `departmentContains` string

A substring of the instructors' department names.

#### `schoolsContains` string | string[]

The set of schools with which the instructors are affiliated.

#### `relatedDepartmentsContains` string | string[]

The set of departments with which the instructors are affiliated.

#### `taughtInTerms` string | string[]

The term(s) in which the instructors taught at least one course.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example responses">

<details>
<summary>Get all instructors whose names contain the string "Eric"</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors?nameContains=Eric"
```

```json
[
  {
    "ucinetid": "crooksr",
    "name": "Roderic Nicholaus Crooks",
    "shortenedName": "CROOKS, R.",
    "...": "..."
  },
  "...",
  {
    "ucinetid": "emj",
    "name": "Eric D Mjolsness",
    "shortenedName": "MJOLSNESS, E.",
    "...": "..."
  },
  "..."
]
```

</details>

<details>
<summary>Get all instructors whose shortened name is "BLAKE, D."</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors?shortenedName=BLAKE, D."
```

```json
[
  { "ucinetid": "dhblake", "name": "David H Blake", "shortenedName": "BLAKE, D.", "...": "..." },
  { "ucinetid": "drblake", "name": "Donald R Blake", "shortenedName": "BLAKE, D.", "...": "..." }
]
```

</details>

<details>
<summary>Get all professors emeriti of the Computer Science department</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors?titleContains=Emeritus&departmentContains=Computer%20Science"
```

```json
[
  "...",
  {
    "ucinetid": "dhirschb",
    "name": "Dan Hirschberg",
    "shortenedName": "HIRSCHBERG, D.",
    "...": "..."
  },
  "...",
  {
    "ucinetid": "pattis",
    "name": "Richard Eric Pattis",
    "shortenedName": "PATTIS, R.",
    "...": "..."
  },
  "..."
]
```

</details>

<details>
<summary>Get all lecturers affiliated with the I&C SCI or PHYSICS departments</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/courses?titleContains=Lecturer&relatedDepartmentsContains=I%26C%20SCI,PHYSICS"
```

```json
[
  {
    "ucinetid": "abahrehb",
    "name": "Amirfarshad Bahrehbakhsh",
    "shortenedName": "BAHREHBAKHSH, A.",
    "bar": "..."
  },
  "...",
  {
    "ucinetid": "alfaro",
    "name": "Shannon L Alfaro",
    "shortenedName": "ALFARO, S.",
    "bar": "..."
  },
  "..."
]
```

</details>

<details>
<summary>Get all department chairs who taught in 2023 Spring</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors?titleContains=Department%20Chair&taughtInTerms=2023%20Spring"
```

```json
[
  {
    "ucinetid": "abiendar",
    "name": "Anke Biendarra",
    "shortenedName": "BIENDARRA, A.",
    "...": "..."
  },
  {
    "ucinetid": "alexac15",
    "name": "Alexandre Chan",
    "shortenedName": "CHAN, A.",
    "...": "..."
  },
  "..."
]
```

</details>

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/instructors.ts
type Instructors = Instructor[];
```

</TabItem>
</Tabs>

## Get all instructors

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/instructors/all"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "ucinetid": "aaaziz1",
    "...": "..."
  },
  {
    "ucinetid": "aabrewer",
    "...": "..."
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/instructors.ts
type Instructors = Instructor[];
```

</TabItem>
</Tabs>
