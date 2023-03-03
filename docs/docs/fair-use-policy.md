# Fair Use Policy

Thank you for considering PeterPortal API for your next project! We're glad to be able to help you in your endeavors.

Before proceeding, please read through this page in its entirety. By sending a request to the API, it means that you have done so and accept all of its terms.

## Rate Limits

PeterPortal API does not currently have strict rate limits. We understand that student projects—especially those made for a hackathon—may experience sudden traffic spikes, and we do not want these applications to stop working due to circumstances outside the developers' control.

With that being said, we ask that all developers refrain from purposefully sending large amounts of requests in a short interval, or making malicious requests with the intent to exploit vulnerabilities in the API. We reserve the right to blacklist IP addresses making such requests.

If you do believe you have discovered a security vulnerability in PeterPortal API, please open an issue [here](https://github.com/icssc/peterportal-api-next). Since we do not serve sensitive data, there is no need to report such issues separately, nor is there an email address for such purposes.

## Setting the `Referer` header

While not required to use the API, we would greatly appreciate it if you could set the `Referer` header to the homepage of the application making the requests. For example, if your web application lives at https://panteate.github.io/awesome-project, or if you are hosting documentation for your non-web application there, we ask that you set that as the `Referer`.

Setting the `Referer` header allows us to determine which endpoints are most used by which applications, allowing us to increase the capacity if necessary, or make further optimizations if we note that these endpoints are slow. By providing a meaningful `Referer` header, you would be helping both yourself and us.

The following is a non-exhaustive list of code snippets for doing so using various HTTP libraries. If the library you're using isn't present below, please don't hesitate to open a pull request!

### Fetch API

<details>
<summary>Code</summary>

```js
import fetch from "cross-fetch"; // ESM import
// const fetch = require("cross-fetch"); // CJS import

const res = await fetch(
  "https://api-next.peterportal.org/v1/rest/websoc" +
    new URLSearchParams({
      year: "2023",
      quarter: "Spring",
      department: "COMPSCI",
    }),
  {
    headers: {
      Referer: "https://panteate.github.io/awesome-project",
      // other headers
    },
    // other options
  }
);
```

</details>

### Axios

<details>
<summary>Code</summary>

```js
import axios from "axios"; // ESM import
// const axios = require("axios"); // CJS import

const res = await axios.get("https://api-next.peterportal.org/v1/rest/websoc", {
  params: {
    year: "2023",
    quarter: "Spring",
    department: "COMPSCI",
  },
  headers: {
    Referer: "https://panteate.github.io/awesome-project",
    // other headers
  },
  // other options
});
```

</details>

### Requests

<details>
<summary>Code</summary>

```py
import requests

res = requests.get("https://api-next.peterportal.org/v1/rest/websoc",
                   params={"year": "2023", "quarter": "Spring", "department": "COMPSCI"},
                   headers={"referer": "https://panteate.github.io/awesome-project",  # other headers
                            }  # other options
                   )
```

</details>
