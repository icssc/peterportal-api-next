import fs from "node:fs";
import { dirname, join } from "node:path";

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
  const currentDirectoryPackageJson = join(root, "package.json");

  if (!isFileReadable(currentDirectoryPackageJson)) {
    return false;
  }

  const content = JSON.parse(fs.readFileSync(currentDirectoryPackageJson, "utf-8")) || {};
  return !!content.workspaces;
}

export function hasWorkspaceRootFile(root: string): boolean {
  return ROOT_FILES.some((file) => fs.existsSync(join(root, file)));
}

export function hasPackageJSON(root: string) {
  const currentDirectoryPackageJson = join(root, "package.json");
  return fs.existsSync(currentDirectoryPackageJson);
}

/**
 * Search up for the nearest `package.json`
 */
export function getClosestProjectDirectory(current = process.cwd(), root = current): string {
  if (hasPackageJSON(current)) {
    return current;
  }

  const dir = dirname(current);

  // reach the fs root
  if (!dir || dir === current) {
    return root;
  }

  return getClosestProjectDirectory(dir, root);
}

/**
 * Search up for the nearest workspace root
 */
export function searchForWorkspaceRoot(
  current: string,
  root = getClosestProjectDirectory(current)
): string {
  if (hasWorkspaceRootFile(current) || hasWorkspacePackageJSON(current)) {
    return current;
  }

  const dir = dirname(current);

  // reached the fs root
  if (!dir || dir === current) {
    return root;
  }

  return searchForWorkspaceRoot(dir, root);
}
