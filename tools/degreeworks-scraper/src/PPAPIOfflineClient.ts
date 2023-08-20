import fetch from "cross-fetch";
import { isErrorResponse } from "peterportal-api-next-types";
import type { Course, RawResponse } from "peterportal-api-next-types";

export class PPAPIOfflineClient {
  private cache: Map<string, Course> = new Map();
  constructor() {
    fetch("https://api-next.peterportal.org/v1/rest/courses/all")
      .then((x) => x.json() as Promise<RawResponse<Course[]>>)
      .then((x) => {
        if (isErrorResponse(x))
          throw new Error("Could not fetch courses cache from PeterPortal API");
        x.payload.forEach((y) => this.cache.set(y.id, y));
        console.log(
          `[PPAPIOfflineClient] Fetched and stored ${x.payload.length} courses from PeterPortal API`,
        );
      });
  }

  getCourse = (courseNumber: string): Course | undefined => this.cache.get(courseNumber);

  getCourses = (
    department: string,
    predicate: (x: Course) => boolean = () => true,
  ): Course[] | undefined =>
    Array.from(this.cache.values())
      .filter((x) => x.id.startsWith(department))
      .filter(predicate);
}
