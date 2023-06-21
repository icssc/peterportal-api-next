import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath as futp } from "url";

import chalk from "chalk";
import { consola } from "consola";

import { getConfig } from "../../../config.js";

const __dirname = futp(new URL(".", import.meta.url));

const imports =
  'import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack";\n';

const createHandlerTemplate = (httpMethod: string) => `\
export const ${httpMethod}: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};
`;

export async function interactiveCreate() {
  const config = await getConfig();
  consola.info(chalk("Creating a new endpoint."));
  let path = "";
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
  const methods: string[] = await consola.prompt("What HTTP methods does it use?", {
    type: "multiselect",
    options: ["GET", "POST", "PUT", "DELETE"],
  });
  consola.info(`Creating an endpoint at ${path} that supports ${methods.join(", ")}`);
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(
    join(srcDir, "..", "package.json"),
    readFileSync(join(__dirname, "../src/cli/commands/create/package.template.json"), {
      encoding: "utf-8",
    }).replace("$name", `api-${path.slice(1).replace(/\//g, "-")}`)
  );
  writeFileSync(
    join(srcDir, "index.ts"),
    [imports, ...methods.map(createHandlerTemplate)].join("\n")
  );
  consola.info(
    `Endpoint created! Don't forget to run ${chalk.bold(
      `${config.packageManager} install`
    )} to integrate the new route.`
  );
}
