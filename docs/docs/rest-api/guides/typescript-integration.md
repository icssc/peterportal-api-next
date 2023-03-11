---
pagination_prev: null
pagination_next: null
---

# TypeScript Integration

We provide a types package on NPM to provide intelligent code completion when working with response objects, as well as a way to safely protect against erroneous or failed requests.

To start using the package in your TypeScript project, run the following command:

```bash npm2yarn
npm install peterportal-api-next-types
```

The following is a code snippet that uses the Fetch API to make requests, but this should work with all HTTP libraries that return the response as an object. You may have to use `JSON.parse` if your library returns a string instead.

<details>
<summary>Code</summary>

```ts
import type {
  RawResponse,
  WebsocAPIResponse,
} from "peterportal-api-next-types";
import { isErrorResponse } from "peterportal-api-next-types";

try {
  const res = await fetch(
    "https://api-next.peterportal.org/v1/rest/websoc" +
      new URLSearchParams({
        year: "2023",
        quarter: "Spring",
        department: "COMPSCI",
      }),
    {
      headers: {
        Referer: "https://docs.api-next.peterportal.org",
      },
    }
  );
  const json: RawResponse<WebsocAPIResponse> = await res.json();
  // These fields are always available regardless of whether the request
  // succeeded or failed.
  console.log(json.timestamp);
  console.log(json.requestId);
  console.log(json.statusCode);
  if (isErrorResponse(json)) {
    // If the request failed, the error message and details will be logged to
    // standard error.
    console.error(json.error);
    console.error(json.message);
  } else {
    // If the request was successful, all courses in the COMPSCI department for
    // Spring 2023 will be logged to standard output.
    // If you are using an editor that supports intelligent code completion,
    // typing json.payload.s in this block should show the `schools` array of
    // the WebSoc API response type.
    console.log(json.payload);
  }
} catch (e) {
  // If fetch itself failed, the error message will be logged to standard error.
  console.error(e);
}
```

</details>
