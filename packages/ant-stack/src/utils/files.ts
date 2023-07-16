import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import packageJson from "../../package.json";

export function createTemporaryFile(fileName = "temp", content = ""): string {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), packageJson.name));

  const temporaryFile = path.join(temporaryDirectory, fileName);

  fs.writeFileSync(temporaryFile, content);

  return temporaryFile;
}
