#!/bin/sh
tsx node_modules/course-scraper/index.ts && sleep 180 &&
tsx node_modules/instructor-scraper/index.ts && sleep 180 &&
tsx node_modules/prereq-scraper/index.ts && tsx index.ts
