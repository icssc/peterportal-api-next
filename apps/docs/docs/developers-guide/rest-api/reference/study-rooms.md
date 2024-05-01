---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Study Rooms

The study rooms endpoint allows users to get information and availability of study rooms that can be reserved at UCI libraries.

## Query parameters

#### `location` string <span style={{ color: "#ff86b4" }}>Required</span>

The location of the study rooms to query. Five locations are available to query:

| location | name                       |
| -------- | -------------------------- |
| Langson  | Langson Library            |
| Gateway  | Gateway Study Center       |
| Science  | Science Library            |
| MRC      | Multimedia Resource Center |
| GML      | Grunigen Medical Library   |

#### `start` string <span style={{ color: "#ff86b4" }}>Required</span>

The start date of time slots to query. YYYY-MM-DD format.

#### `end` string <span style={{ color: "#ff86b4" }}>Required</span>

The end date of time slots to query. YYYY-MM-DD format.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/studyRooms?location=Science&start=2024-04-26&end=2024-04-30""
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "id": "Science",
  "name": "Science Library",
  "lid": "6580",
  "rooms": [
    {
      "id": "44667",
      "name": "Science 371",
      "capacity": 8,
      "location": "Science Library",
      "description": "This Collaborative Technology Work Space is located on the upper level of the 2nd Floor Grand Reading Room. Access via the stairway halfway through the Grand Reading Room. Digital display available. Bring your own laptop.",
      "directions": "Access via the elevators or stairway, on the upper level of the Grand Reading Room.",
      "techEnhanced": true,
      "timeSlots": [
        {
          "date": "2024-04-27",
          "start": "13:00:00",
          "end": "13:30:00",
          "booked": false
        }
        "..."
      ]
    }
    "..."
  ]
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/types/types/studyRoom
type StudyLocation = {
  id: string;
  lid: string;
  name: string;
  rooms: {
    id: string;
    name: string;
    capacity: number;
    location: string;
    description?: string;
    directions?: string;
    timeSlots?: {
      date: string;
      start: string;
      end: string;
      booked: boolean;
    }[];
    techEnhanced?: boolean;
  }[];
};
```

</TabItem>
</Tabs>

## Get all study rooms

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/studyRooms/all?start=2024-04-26&end=2024-04-30"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
[
  {
    "id": "Langson",
    "...": "..."
  },
  {
    "id": "Gateway",
    "...": "..."
  },
  "..."
]
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/types/types/studyRoom
type StudyLocations = StudyLocation[];
```

</TabItem>
</Tabs>
