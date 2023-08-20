import fetch from "cross-fetch";
import { isErrorResponse } from "peterportal-api-next-types";
import type { Course, RawResponse } from "peterportal-api-next-types";

export class PPAPIOfflineClient {
  private cache = new Map<string, Course>();

  private constructor() {}

  static async new(): Promise<PPAPIOfflineClient> {
    const ppapi = new PPAPIOfflineClient();
    const res = await fetch("https://api-next.peterportal.org/v1/rest/courses/all");
    const json: RawResponse<Course[]> = await res.json();
    if (isErrorResponse(json))
      throw new Error("Could not fetch courses cache from PeterPortal API");
    json.payload.forEach((y) => ppapi.cache.set(y.id, y));
    console.log(
      `[PPAPIOfflineClient.new] Fetched and stored ${json.payload.length} courses from PeterPortal API`,
    );
    return ppapi;
  }

  getCourse = (courseNumber: string): Course | undefined => this.cache.get(courseNumber);

  getCoursesByDepartment = (
    department: string,
    predicate: (x: Course) => boolean = () => true,
  ): Course[] =>
    Array.from(this.cache.values())
      .filter((x) => x.id.startsWith(department))
      .filter(predicate);
}
