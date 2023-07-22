---
pagination_prev: null
pagination_next: null
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Week

The week endpoint allows users to get what week of instruction it is, what term(s) are currently in progress or in finals, and a pretty display string for the relevant information.

## Query parameters

#### `year` string

The year to query.

#### `month` string

The month to query.

#### `day` string

The day to query.

Note that all parameters must either be provided, in which case the response will be for the given date, or empty, in which case the response will be for today.

### Code sample

<Tabs>
<TabItem value="bash" label="cURL">

```bash
curl "https://api-next.peterportal.org/v1/rest/week"
```

</TabItem>
</Tabs>

### Response

<Tabs>
<TabItem value="json" label="Example responses">

<details>
<summary>School not in session</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=3&day=25"
```

```json
{
  "weeks": [-1],
  "quarters": ["N/A"],
  "display": "Enjoy your break! 😎"
}
```

</details>

<details>
<summary>One term in session</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=5&day=1"
```

```json
{
  "weeks": [5],
  "quarters": ["Spring Quarter 2023"],
  "display": "Week 5 • Spring Quarter 2023"
}
```

</details>

<details>
<summary>One term in finals</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=6&day=15"
```

```json
{
  "weeks": [-1],
  "quarters": ["Spring Quarter 2023"],
  "display": "Finals Week • Spring Quarter 2023. Good luck! 🤞"
}
```

</details>

<details>
<summary>Two terms in session, same week numbers</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=6&day=26"
```

```json
{
  "weeks": [1, 1],
  "quarters": ["Summer Session I 2023", "Summer Session 10WK 2023"],
  "display": "Week 1 • Summer Session I 2023 | Summer Session 10WK 2023"
}
```

</details>

<details>
<summary>Two terms in session, different week numbers</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=8&day=7"
```

```json
{
  "weeks": [7, 1],
  "quarters": ["Summer Session 10WK 2023", "Summer Session II 2023"],
  "display": "Week 7 • Summer Session 10WK 2023 | Week 1 • Summer Session II 2023"
}
```

</details>

<details>
<summary>One term in session and another term in finals</summary>

```bash
curl "https://api-next.peterportal.org/v1/rest/week?year=2023&month=9&day=1"
```

```json
{
  "weeks": [4, -1],
  "quarters": ["Summer Session II 2023", "Summer Session 10WK 2023"],
  "display": "Finals • Summer Session 10WK 2023. Good luck! 🤞 | Week 4 • Summer Session II 2023"
}
```

</details>

</TabItem>
<TabItem value="ts" label="Payload schema">

```typescript
// https://github.com/icssc/peterportal-api-next/blob/main/packages/peterportal-api-next-types/types/week.ts
type WeekData = {
  weeks: number[];
  quarters: string[];
  display: string;
}[];
```

</TabItem>
</Tabs>
