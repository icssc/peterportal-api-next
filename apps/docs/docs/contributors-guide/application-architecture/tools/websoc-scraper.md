---
pagination_prev: null
pagination_next: null
---

# WebSoc Scraper

The `websoc-scraper-v2` periodically scrapes the contents of WebSoc, and uploads it to our database.

## Interlude: Why V2?

In the early days of this project, we had a radically different approach to caching WebSoc. Instead of getting all the data at once, which we deemed infeasible at the time, we would instead scrape reactively, caching requests that we only actually received. The idea was that after the initial cache miss, the most popular requests would all be cache hits, so things would still be fast.

The problem came when it came to applying WebSoc filters; since we were also using [DynamoDB](https://aws.amazon.com/dynamodb/) at the time, there were some operations that we simply could not support without incurring a full-table scan, which takes a lot of time and resources.

Ultimately, we decided to scrap the old scraping approach, and adopted the current one.

## Technical Details

The scraper runs in a Docker container hosted on [Fargate](https://aws.amazon.com/fargate/), which was necessary because scraping WebSoc takes too much time and memory for Lambda. In accordance with the Registrar's requirements, we pause for 500 milliseconds between each department or GE category that we scrape, and 3 minutes between each term we scrape, so as not to overload the WebSoc servers.

To determine which terms to scrape, we use the `@libs/registrar-api` module, and we get the start and end dates for all available terms for academic years that include the current calendar year, the previous calendar year, and the next calendar year. We then filter out the terms that have already ended, and the terms that are not yet available, since the data for those terms are not likely to be accessed frequently enough to warrant storing it in our cache. Once we've identified the terms to scrape, it's just a matter of iterating over all the departments.
