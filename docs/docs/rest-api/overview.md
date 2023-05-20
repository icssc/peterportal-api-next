---
pagination_prev: null
pagination_next: null
---

# Overview

## API Versioning

The API follows [Semantic Versioning](https://semver.org/), with the major version being reflected in the first path part of each endpoint's path.

As per Semantic Versioning, any breaking changes will only be released in a new major version. These include the following:

- Removing an endpoint, parameter, or response field
- Adding a new required parameter or making a previously optional parameter required
- Changing the type of a response field
- Removing valid values for a parameter

Any non-breaking changes will be added directly to the current latest major version. These include the following:

- Adding or deprecating an endpoint, optional parameter, or response field
- Adding or deprecating valid values for a parameter

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
