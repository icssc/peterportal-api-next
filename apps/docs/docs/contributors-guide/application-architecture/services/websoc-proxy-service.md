---
pagination_prev: null
pagination_next: null
---

# WebSoc Proxy Service

The `websoc-proxy-service` encapsulates the `@libs/websoc-api-next` module, allowing the WebSoc route to invoke it only when requests to WebSoc are necessary. This improves performance for cached responses, since fetching and parsing WebSoc responses are slow and require additional machinery. Like most services used in/by the API, the WebSoc proxy service is deployed as a Lambda, and is warmed every five minutes to minimize latency caused by cold starts.
