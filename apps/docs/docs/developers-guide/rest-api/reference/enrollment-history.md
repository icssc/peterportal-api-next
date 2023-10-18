---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Enrollment History

The enrollment history endpoint allows users to

## Query parameters for all endpoints

#### `year` string

The year to include.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2

The quarter to include. Case-sensitive.

#### `instructor` string

The shortened name of the instructor to include. (Ex.: `SHINDLER, M.`)

#### `courseNumber` string

The course number to include. (Ex.: 161)

#### `sectionCode` string

The five-digit section code to include.

#### `sectionType` | Act | Col | Dis | Fld | Lab | Lec | Qiz | Res | Sem | Stu | Tap | Tut

The section type code. Case-sensitive.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/enrollmentHistory?year=2022&quarter=Fall&department=I%26C%20SCI&courseNumber=46"
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
    "sectionCode": 35730,
    "department": "I&C SCI",
    "courseNumber": "46",
    "sectionType": "Lec",
    "sectionNum": "A",
    "units": "4",
    "instructors": ["SHINDLER, M.", "GARZA RODRIGUE, A.", "GILA, O."],
    "meetings": [{ "days": "MWF", "time": "8:00- 8:50", "bldg": ["EH 1200"] }],
    "finalExam": "Mon, Dec 5, 8:00-10:00am",
    "dates": ["2022-05-17", "2022-05-18", "..."],
    "maxCapacityHistory": ["220", "220", "220", "..."],
    "totalEnrolledHistory": ["5", "5", "7", "..."],
    "waitlistHistory": ["n/a", "n/a", "n/a", "..."],
    "waitlistCapHistory": ["0", "0", "0", "..."],
    "requestedHistory": ["7", "8", "11", "..."],
    "newOnlyReservedHistory": ["0", "0", "0", "..."],
    "statusHistory": ["OPEN", "OPEN", "OPEN", "..."]
  },
  {
    "year": "2022",
    "quarter": "Fall",
    "sectionCode": 35740,
    "department": "I&C SCI",
    "courseNumber": "46",
    "sectionType": "Lec",
    "sectionNum": "B",
    "units": "4",
    "instructors": ["SHINDLER, M.", "DICKERSON, M."],
    "meetings": [{ "days": "MWF", "time": "10:00-10:50", "bldg": ["SSLH 100"] }],
    "finalExam": "Mon, Dec 5, 10:30-12:30pm",
    "dates": ["2022-05-17", "2022-05-18", "..."],
    "maxCapacityHistory": ["220", "220", "220", "..."],
    "totalEnrolledHistory": ["38", "44", "58", "..."],
    "waitlistHistory": ["n/a", "n/a", "n/a", "..."],
    "waitlistCapHistory": ["0", "0", "0", "..."],
    "requestedHistory": ["41", "49", "66", "..."],
    "newOnlyReservedHistory": ["0", "0", "0", "..."],
    "statusHistory": ["OPEN", "OPEN", "OPEN", "..."]
  }
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/calendar.ts
type EnrollmentHistory = {
  year: string;
  quarter: Quarter;
  sectionCode: string;
  department: string;
  courseNumber: string;
  sectionType: string;
  sectionNum: string;
  units: string;
  instructors: string[];
  meetings: string[];
  finalExam: string;
  dates: string[];
  maxCapacityHistory: string[];
  totalEnrolledHistory: string[];
  waitlistHistory: string[];
  waitlistCapHistory: string[];
  requestedHistory: string[];
  newOnlyReservedHistory: string[];
  statusHistory: string[];
};
```

</TabItem>
</Tabs>
