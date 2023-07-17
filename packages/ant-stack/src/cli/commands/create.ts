import fs from "node:fs";
import path from "node:path";

import chalk from "chalk";
import { consola } from "consola";

import { getConfig } from "../../config.js";
import { getClosestProjectDirectory } from "../../utils/searchRoot.js";

const createHandlerTemplate = (httpMethod: string) => `\
export const ${httpMethod}: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
}${httpMethod === "GET" ? `\n\nexport const HEAD = GET;` : ""}
`;

/**
 * {@link __dirname} is compiled by ESBuild.
 */
const projectDirectory = getClosestProjectDirectory(__dirname);

const templateDirectory = path.join(projectDirectory, "src", "templates");

export interface PackageJsonProps {
  directory: string;
}

function generatePackageJson(props: PackageJsonProps): string {
  const apiRoute = props.directory.slice(1).replace(/\//g, "-");

  const rawTemplate = fs.readFileSync(path.join(templateDirectory, "package.json"), "utf8");

  const parsedTemplate = rawTemplate.replace("$name", `api-${apiRoute}`);

  return parsedTemplate;
}

export interface EntryFileProps {
  directory: string;
  methods: string[];
}

function generateEntryFile(props: EntryFileProps): string {
  const imports =
    'import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack";\n';

  const exports = props.methods.map(createHandlerTemplate).join("\n");

  return `${imports}\n${exports}`;
}

export async function interactiveCreate() {
  const config = await getConfig();

  consola.info(chalk("Creating a new endpoint."));

  let endpoint = "";

  while (!endpoint) {
    endpoint = await consola.prompt("What is the path of the endpoint?", { type: "text" });

    if (!(endpoint.match(/\/[0-9A-Za-z]+/) && !endpoint.endsWith("/"))) {
      consola.error(
        chalk.red(
          "Malformed path provided. A well-formed path must consist entirely of path parts (one slash followed by at least one alphanumeric character), and must not end with a slash (e.g. /v1/rest/test).",
        ),
      );
      endpoint = "";
    }
  }

  const newProjectDirectory = path.join(config.directory, endpoint);

  if (fs.existsSync(newProjectDirectory)) {
    consola.warn(`A route already exists at ${endpoint}.`);

    const create = await consola.prompt(
      "Would you like to create a new route anyway? This will overwrite the existing route!",
      { type: "confirm" },
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

  consola.info(`Creating an endpoint at ${endpoint} that supports ${methods.join(", ")}`);

  fs.mkdirSync(path.join(newProjectDirectory, "src"), { recursive: true });

  const packageJson = generatePackageJson({ directory: endpoint });
  const entryFile = generateEntryFile({ directory: endpoint, methods });

  fs.writeFileSync(path.join(newProjectDirectory, "package.json"), packageJson);
  fs.writeFileSync(path.join(newProjectDirectory, "src", "index.ts"), entryFile);

  consola.info(
    `Endpoint created! Don't forget to run ${chalk.bold(
      `${config.packageManager} install`,
    )} to integrate the new route.`,
  );
}
