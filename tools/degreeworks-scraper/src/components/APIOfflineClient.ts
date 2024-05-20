import type { Course, RawResponse } from "@anteater-api/types";
import fetch from "cross-fetch";

const ENDPOINT = "https://anteaterapi.com/v1/rest/courses/all";

export class APIOfflineClient {
  private cache = new Map<string, Course>();

  private constructor() {}

  static async new(): Promise<APIOfflineClient> {
    const apiClient = new APIOfflineClient();
    const res = await fetch(ENDPOINT, { headers: { "accept-encoding": "gzip" } });
    const json: RawResponse<Course[]> = await res.json();
    if (!json.success) throw new Error("Could not fetch courses cache from Anteater API");
    json.payload.forEach((y) => apiClient.cache.set(y.id, y));
    console.log(
      `[APIOfflineClient.new] Fetched and stored ${json.payload.length} courses from Anteater API`,
    );
    return apiClient;
  }

  getCourse(courseNumber: string): Course | undefined {
    return this.cache.get(courseNumber);
  }

  getCoursesByDepartment(
    department: string,
    predicate: (x: Course) => boolean = () => true,
  ): Course[] {
    return Array.from(this.cache.values())
      .filter((x) => x.id.startsWith(department))
      .filter(predicate);
  }
}
