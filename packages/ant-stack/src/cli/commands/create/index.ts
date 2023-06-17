import chalk from "chalk";
import { consola } from "consola";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";

import { getConfig } from "../../../config.js";

const packageJson = (name: string) =>
  `{"name": "api-${name
    .slice(1)
    .replace(
      /\//g,
      "-"
    )}","version": "0.0.0","type": "module","scripts":{"dev": "ant dev","build": "ant build","start": "node dist"},"dependencies": {"ant-stack": "*"},"devDependencies":{"@types/node": "18","tsx": "*","typescript": "~5.0"}}`;

const imports = `import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack"\n\n`;

const handlers = (method: string) =>
  `export const ${method}: InternalHandler = async (event) => {return createOKResult({}, zeroUUID);};`;

export async function interactiveCreate() {
  const config = await getConfig();
  consola.info(chalk("Creating a new endpoint."));
  let path = "",
  let success = false;
  while (!success) {
    path = await consola.prompt("What is the path of the endpoint?", { type: "text" });
    if (!(path.match(/\/[0-9A-Za-z]+/) && !path.endsWith("/"))) {
      consola.error(
        chalk.red(
          "Malformed path provided. A well-formed path must consist entirely of path parts (one slash followed by at least one alphanumeric character), and must not end with a slash (e.g. /v1/rest/test)."
        )
      );
      continue;
    }
    success = true;
  }
  const srcDir = join(config.directory, path, "src");
  if (existsSync(srcDir)) {
    consola.warn(`A route already exists at ${path}.`);
    const create = await consola.prompt(
      "Would you like to create a new route anyway? This will overwrite the existing route!",
      { type: "confirm" }
    );
    if (!create) {
      consola.error(chalk.red("Aborting."));
      return;
    }
  }
  const methods = await consola.prompt("What HTTP methods does it use?", {
    type: "multiselect",
    options: ["GET", "POST", "PUT", "DELETE"],
  });
  consola.info(`Creating an endpoint at ${path} that supports ${methods.join(", ")}`);
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(join(srcDir, "..", "package.json"), format(packageJson(path), { parser: "json" }));
  writeFileSync(
    join(srcDir, "index.ts"),
    format([imports, ...methods.map((method) => handlers(method))].join(""), {
      parser: "babel",
    })
  );
  consola.info(
    `Endpoint created! Don't forget to run ${chalk.bold(
      `${config.packageManager} install`
    )} to integrate the new route.`
  );
}
