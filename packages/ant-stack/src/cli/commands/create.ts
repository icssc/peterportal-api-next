import { type } from "arktype";
import chalk from "chalk";
import { consola } from "consola";

export async function interactiveCreate() {
  consola.info(chalk.blue("Create a new endpoint interactively!"));
  await consola.prompt("What is the name of the endpoint?", { type: "text" });
  await consola.prompt("What HTTP methods does it use?", {
    type: "multiselect",
    options: ["GET", "POST", "PUT", "DELETE"],
  });
  consola.info(chalk.green.bgYellow(`Endpoint created!`));
}

export const CreateOptions = type({
  endpoint: "string",
  methods: "string[]",
});

export async function automaticCreate(options: typeof CreateOptions.infer) {
  consola.info(chalk.blue("Creating a new endpoint from options!"));
  consola.info(chalk.greenBright.bgRedBright(options));
  consola.info(chalk.green.bgYellow(`Endpoint created!`));
}
