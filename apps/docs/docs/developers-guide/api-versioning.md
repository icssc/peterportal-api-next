---
pagination_prev: null
pagination_next: null
---

# API Versioning

The API follows [Semantic Versioning](https://semver.org/), with the major version being reflected in the first path part of each endpoint's path.

As per Semantic Versioning, any breaking changes will only be released in a new major version. These include the following:

- Removing an endpoint, parameter, or response field
- Adding a new required parameter or making a previously optional parameter required
- Changing the type of a response field
- Removing valid values for a parameter

Any non-breaking changes will be added directly to the current latest major version. These include the following:

- Adding or deprecating an endpoint, optional parameter, or response field
- Adding or deprecating valid values for a parameter
