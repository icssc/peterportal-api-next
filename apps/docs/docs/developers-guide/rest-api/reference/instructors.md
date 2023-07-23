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
