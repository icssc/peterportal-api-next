import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Recursively find all paths to projects starting from a given root directory.
 */
export function findAllProjects(root = ".", directory = "", paths: string[] = []): string[] {
  if (existsSync(`${root}/${directory}/package.json`)) {
    paths.push(join(root, directory));
    return paths;
  }

  const subRoutes = readdirSync(`${root}/${directory}`, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return subRoutes.flatMap((subRoute) => findAllProjects(root, `${directory}/${subRoute}`, paths));
}
