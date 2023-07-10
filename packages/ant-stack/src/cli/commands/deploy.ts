import { spawnSync } from "node:child_process";
import path from "node:path";

import { getClosestProjectDirectory } from "../../utils/directories.js";

const projectDirectory = getClosestProjectDirectory(__dirname);

const appEntry = path.join(projectDirectory, "src", "cdk", "index.ts");

const app = `tsx ${appEntry}`;

const cdkCommand = ["cdk", "deploy", "--app", app, "*", "--require-approval", "never"];

export function deploy() {
  spawnSync("npx", cdkCommand);
}
