import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import packageJson from "../../package.json";

const jsFileExtensions = ["js", "cjs", "mjs", "jsx"];

const tsFileExtesions = jsFileExtensions.map((ext) => ext.replace("js", "ts"));

const jsOrTsFileExtensions = [...jsFileExtensions, ...tsFileExtesions];

/**
 * Finds all files in a directory, or the directroy/index.js file if it's a directory.
 * TODO: fix efficiency issues.
 */
export function getAllFilesOrIndex(directory: string): string[] {
  const allFilesOrIndex = fs
    .readdirSync(directory)
    .map((file) => path.resolve(path.join(directory, file)))
    .map((file) => ({ stats: fs.statSync(file), file }))
    .filter(
      ({ stats, file }) =>
        stats.isFile() ||
        jsOrTsFileExtensions.some((extension) =>
          fs.existsSync(path.join(file, `index.${extension}`))
        )
    )
    .map(({ stats, file }) => {
      if (stats.isFile()) {
        return file;
      } else {
        const extension = jsOrTsFileExtensions.find((extension) =>
          fs.existsSync(path.join(file, `index.${extension}`))
        );
        return path.join(file, `index.${extension}`);
      }
    });

  return allFilesOrIndex;
}

export function createTemporaryFile(name = "", extension = ".tmp", content = ""): string {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), packageJson.name));

  const temporaryFile = path.join(temporaryDirectory, `${name}${extension}`);

  fs.writeFileSync(temporaryFile, content);

  return temporaryFile;
}
