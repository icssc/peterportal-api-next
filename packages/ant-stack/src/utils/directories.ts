import fs from "node:fs";
import path from "node:path";

export function getDirectories(source: string) {
  return fs.existsSync(source)
    ? fs
        .readdirSync(source)
        .map((name) => path.join(source, name))
        .filter((source) => fs.lstatSync(source).isDirectory())
    : [];
}

export function isFileReadable(filename: string): boolean {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    if (!fs.statSync(filename, { throwIfNoEntry: false })) {
      return false;
    }

    // Check if current process has read permission to the file
    fs.accessSync(filename, fs.constants.R_OK);

    return true;
  } catch {
    return false;
  }
}

// https://github.com/vitejs/vite/issues/2820#issuecomment-812495079
const ROOT_FILES = [
  // '.git',

  // https://pnpm.io/workspaces/
  "pnpm-workspace.yaml",

  // https://rushjs.io/pages/advanced/config_files/
  // 'rush.json',

  // https://nx.dev/latest/react/getting-started/nx-setup
  // 'workspace.json',
  // 'nx.json',

  // https://github.com/lerna/lerna#lernajson
  "lerna.json",
];

// npm: https://docs.npmjs.com/cli/v7/using-npm/workspaces#installing-workspaces
// yarn: https://classic.yarnpkg.com/en/docs/workspaces/#toc-how-to-use-it
export function hasWorkspacePackageJSON(root: string): boolean {
  const currentDirectoryPackageJson = path.join(root, "package.json");

  if (!isFileReadable(currentDirectoryPackageJson)) {
    return false;
  }

  const content = JSON.parse(fs.readFileSync(currentDirectoryPackageJson, "utf-8")) || {};
  return !!content.workspaces;
}

export function hasRootFile(root: string): boolean {
  return ROOT_FILES.some((file) => fs.existsSync(path.join(root, file)));
}

export function hasPackageJSON(root: string) {
  const currentDirectoryPackageJson = path.join(root, "package.json");
  return fs.existsSync(currentDirectoryPackageJson);
}

/**
 * Search up for the nearest `package.json`, i.e. the current project root.
 */
export function getClosestProjectDirectory(current: string, root = current): string {
  if (hasPackageJSON(current)) return current;

  const currentDirectory = path.dirname(current);

  // reach the fs root
  if (!currentDirectory || currentDirectory === current) return root;

  return getClosestProjectDirectory(currentDirectory, root);
}

/**
 * Search up for the nearest workspace root.
 */
export function getWorkspaceRoot(
  current: string,
  root = getClosestProjectDirectory(current)
): string {
  if (hasRootFile(current)) return current;
  if (hasWorkspacePackageJSON(current)) return current;

  const currentDirectory = path.dirname(current);

  // reach the fs root
  if (!currentDirectory || currentDirectory === current) return root;

  return getWorkspaceRoot(currentDirectory, root);
}

/**
 */
export function getFilesRecursively(directory: string): string[] {
  return fs
    .readdirSync(directory)
    .map((name) => path.join(directory, name))
    .flatMap((fileOrDirectory) =>
      fs.statSync(fileOrDirectory).isDirectory()
        ? getFilesRecursively(fileOrDirectory)
        : fileOrDirectory
    );
}

/**
 * Recursively find all paths to projects starting from a given root directory.
 */
export function findAllProjects(root = "."): string[] {
  const allProjects = findSubProjects(root);
  const dedupedProjects = [...new Set(allProjects)];
  return dedupedProjects;
}

/**
 * Recursively find all paths to projects starting from a given root directory.
 */
export function findSubProjects(root = ".", directory = "", paths: string[] = []): string[] {
  if (fs.existsSync(`${root}/${directory}/package.json`)) {
    paths.push(path.join(root, directory));
    return paths;
  }

  const subRoutes = fs
    .readdirSync(`${root}/${directory}`, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return subRoutes.flatMap((subRoute) => findSubProjects(root, `${directory}/${subRoute}`, paths));
}

export interface FindUpOptions {
  /**
   * @default process.cwd
   */
  cwd?: string;

  /**
   * @default path.parse(cwd).root
   */
  stopAt?: string;

  /**
   * @default false
   */
  multiple?: boolean;

  /**
   * @default true
   */
  allowSymlinks?: boolean;
}

function existsSync(fp: string) {
  try {
    fs.accessSync(fp, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Given an array of files to look for, recursively find all matching files until {@link stopAt} is reached.
 */
export function findUpForFiles(files: string[], options: FindUpOptions = {}): string[] {
  const {
    cwd = process.cwd(),
    stopAt = path.parse(cwd).root,
    multiple = false,
    allowSymlinks = true,
  } = options;

  let current = cwd;

  const foundFiles: string[] = [];

  const stat = allowSymlinks ? fs.statSync : fs.lstatSync;

  while (current && current !== stopAt) {
    for (const file of files) {
      const filepath = path.resolve(current, file);

      if (existsSync(filepath) && stat(filepath).isFile()) {
        foundFiles.push(filepath);

        if (!multiple) {
          return foundFiles;
        }
      }
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return foundFiles;
}
