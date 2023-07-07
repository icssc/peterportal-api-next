import { spawnSync } from "node:child_process";
import path from "node:path";

import { getClosestProjectDirectory } from "../../utils/searchRoot.js";

const projectDirectory = getClosestProjectDirectory();

const app = path.join(projectDirectory, "src", "cdk", "index.ts");

const cdkCommand = ["cdk", "deploy", "--app", app, "*", "--require-approval", "never"];

export function deploy() {
  spawnSync("npx", cdkCommand);
}
