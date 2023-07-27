---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Calendar

The calendar endpoint allows users to fetch important dates for the given quarter, such as when instruction begins and ends, and when final exams begin and end.

## Query parameters

#### `year` string <span style={{ color: "#ff86b4" }}>Required</span>

The year to query.

#### `quarter` Fall | Winter | Spring | Summer1 | Summer10wk | Summer2 <span style={{ color: "#ff86b4" }}>Required</span>

The quarter to query. Case-sensitive.

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/calendar?year=2023&quarter=Spring"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example response">

```json
{
  "instructionStart": "2023-04-03T00:00:00.000Z",
  "instructionEnd": "2023-06-09T00:00:00.000Z",
  "finalsStart": "2023-06-10T00:00:00.000Z",
  "finalsEnd": "2023-06-15T00:00:00.000Z"
}
```

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/calendar.ts
type QuarterDates = {
  instructionStart: string;
  instructionEnd: string;
  finalsStart: string;
  finalsEnd: string;
};
```

</TabItem>
</Tabs>
