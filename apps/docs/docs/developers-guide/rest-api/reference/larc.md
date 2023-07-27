---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# LARC

The LARC endpoint allows users to fetch the available LARC sections for a given quarter.

## Query parameters

#### `year` string <span style={{ color: "#ff86b4" }}>Required</span>

The year to query.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2 <span style={{ color: "#ff86b4" }}>Required</span>

The quarter to query. Case-sensitive.

Note that it appears that 10-week Summer Sessions do not have LARC sessions, so querying this endpoint with that option will always return an empty array.

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/larc?year=2023&quarter=Summer1"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "courseInfo": {
      "courseNumber": "CHEM 1C",
      "courseName": "General Chemistry"
    },
    "sections": [
      {
        "day": "MW",
        "time": "9:00-10:50a",
        "instructor": "Noam Levi",
        "building": "ON LINE"
      },
      {
        "day": "MW",
        "time": "11:00a-12:50p",
        "instructor": "Noam Levi",
        "building": "ON LINE"
      }
    ]
  },
  {
    "courseInfo": {
      "courseNumber": "CHEM 51B",
      "courseName": "Organic Chemistry"
    },
    "sections": [
      {
        "day": "MW",
        "time": "1:00-2:50p",
        "instructor": "Ashley Shah",
        "building": "ON LINE"
      },
      {
        "day": "MW",
        "time": "3:00-4:50p",
        "instructor": "Ashley Shah",
        "building": "ON LINE"
      }
    ]
  }
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/larc.ts
type LarcCourse = {
  courseInfo: {
    courseNumber: string;
    sameAs?: string;
    courseName: string;
  };
  sections: {
    days: string;
    time: string;
    instructor: string;
    bldg: string;
  }[];
}[];
```

</TabItem>
</Tabs>
