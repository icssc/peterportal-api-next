---
pagination_prev: null
pagination_next: null
---

# Overview

## Request Schema

All requests to the REST API are to be made over HTTPS, using the URL https://api-next.peterportal.org/v1/rest.

Some endpoints have query parameters with the type `string | string[]`. This means that it is permitted to pass multiple values to the parameter in question, by repeating the parameter name and/or passing in a comma-delimited string.

For example, if `arg` is such a parameter, then the following query strings are all valid inputs and have the same result.

- `?arg=foo&arg=bar&arg=baz&arg=quux`
- `?arg=foo,bar&arg=baz&arg=quux`
- `?arg=foo,bar&arg=baz,quux`
- `?arg=foo,bar,baz,quux`

## Response Schema

All responses, successful or otherwise, will be sent as JSON, and are guaranteed to contain the following fields:

| Field        | Type     | Description                                                                                     | Example                                                                |
| ------------ | -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `timestamp`  | `string` | When (in CLF format) the request was processed.                                                 | `"04/Mar/2023:21:04:09 +0000"`                                         |
| `requestId`  | `string` | The unique identifier of the request.                                                           | A [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier). |
| `statusCode` | `number` | The [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) of the request. | `200`                                                                  |

Successful responses will additionally contain the `payload` field, which will include the requested data.

Erroneous responses will instead contain the following fields:

| Field     | Type     | Description                                                  | Example                       |
| --------- | -------- | ------------------------------------------------------------ | ----------------------------- |
| `error`   | `string` | The message phrase associated with the status code.          | `Bad Request`                 |
| `message` | `string` | The error that occurred while trying to process the request. | `Parameter year not provided` |

## Compression

By default, the API compresses responses that are larger than 128 KB using gzip. This is done to improve performance and network efficiency.

If your usecase does not support compressed responses, make sure to send the `Accept-Encoding` header with an empty value. This will ensure that the response will be returned in plaintext. Note that doing so may fail for endpoints that return large amounts of data.

The API supports both gzip and DEFLATE. If only DEFLATE is passed in the `Accept-Encoding` header, then it will be used. Otherwise, gzip will be used.
