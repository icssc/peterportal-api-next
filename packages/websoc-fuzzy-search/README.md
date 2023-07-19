# websoc-fuzzy-search

A fuzzy search module for cached WebSoc data.

## Installation

`$ npm install --save websoc-fuzzy-search`

## Documentation

### Types

#### CourseLevel

`CourseLevel` is an integer literal that holds one of the following values.

| Literal Value |                  Meaning                  |
| :-----------: | :---------------------------------------: |
|      `0`      |       Lower Division courses (1-99)       |
|      `1`      |     Upper Division courses (100-199)      |
|      `2`      | Graduate/Professional Only courses (200+) |

#### GECategory

`GECategory` is a string literal that holds one of the following values.

| Literal Value |            Meaning             |
| :-----------: | :----------------------------: |
|    `GE-1A`    |     Lower Division Writing     |
|    `GE-1B`    |     Upper Division Writing     |
|    `GE-2`     |     Science and Technology     |
|    `GE-3`     | Social and Behavioral Sciences |
|    `GE-4`     |      Arts and Humanities       |
|    `GE-5A`    |     Quantitative Literacy      |
|    `GE-5B`    |        Formal Reasoning        |
|    `GE-6`     |  Language other than English   |
|    `GE-7`     |     Multicultural Studies      |
|    `GE-8`     |  International/Global Issues   |

#### ResultType

`ResultType` is a string literal that holds one of the following values. The internal value is used to sort the final
response.

| Literal Value | Internal Value |
| :-----------: | :------------: |
| `GE_CATEGORY` |      `4`       |
| `DEPARTMENT`  |      `3`       |
|   `COURSE`    |      `2`       |
| `INSTRUCTOR`  |      `1`       |

#### FilterOptions

`FilterOptions` represents any desired `Metadata` attributes in the final result(s). It has four possible fields, all of
which are optional.

A list of acceptable values for `department`s and `school`s can be found in the source data
[here](https://github.com/icssc/wfs-scripts/tree/main/sources).

|     Field     |      Type       |                      Description                      |
| :-----------: | :-------------: | :---------------------------------------------------: |
| `courseLevel` | `CourseLevel[]` |     The course level(s) to match. (Courses only)      |
|   `geList`    | `GECategory[]`  |    The GE categor(y/ies) to match. (Courses only)     |
| `department`  |   `string[]`    | The department(s) to match. (Courses and Instructors) |
|   `school`    |   `string[]`    |   The school(s) to match. (Courses and Instructors)   |

#### SearchParams

`SearchParams` represents the parameters for which to search. It has four possible fields, all of which are optional.

|      Field      |      Type       |                      Description                      |
| :-------------: | :-------------: | :---------------------------------------------------: |
|     `query`     |    `string`     |                   The search query.                   |
|  `numResults`   |    `number`     |       The maximum number of results to return.        |
|  `resultType`   |  `ResultType`   |      Which type of result to return exclusively.      |
| `filterOptions` | `FilterOptions` | Any `Metadata` attributes the result(s) must possess. |

#### SearchResult

`SearchResult` represents a single object matched by the fuzzy search process.

|   Field    |     Type     |                       Description                       |
| :--------: | :----------: | :-----------------------------------------------------: |
|   `type`   | `ResultType` |             The type of the result matched.             |
|   `name`   |   `string`   |       The descriptive name of the result matched.       |
| `metadata` |    `any`     | Any metadata relevant to the result matched. (Optional) |

Two interfaces extend upon this interface; each has a different type for the `metadata` field and its own type guard
function for TypeScript compatibility.

#### CourseMetadata

|     Field     |      Type      |                    Description                    |
| :-----------: | :------------: | :-----------------------------------------------: |
| `department`  |    `string`    |      The department that offers this course.      |
|   `number`    |    `string`    |                The course number.                 |
|   `geList`    | `GECategory[]` | GE categor(y/ies), if any, this course satisfies. |
| `courseLevel` | `CourseLevel`  |             The level of this course.             |
|   `school`    |    `string`    | The school/academic unit this course falls under. |

#### InstructorMetadata

|    Field     |    Type    |                    Description                    |
| :----------: | :--------: | :-----------------------------------------------: |
|  `ucinetid`  |  `string`  |            The instructor's UCINetID.             |
|   `school`   | `string[]` | The school(s) to which this instructor belong(s). |
| `department` | `string[]` | The department to which this instructor belongs.  |

### Functions

#### search

Signature: `search(params?: SearchParams): Record<string, SearchResult>`

Performs a fuzzy-search query based on the parameters given (if any), and returns a mapping of unique string
identifiers to `SearchResult` objects.

#### `isCourseSearchResult` and `isInstructorSearchResult`

These type guard functions are provided for TypeScript-based projects and are fairly self-explanatory.
