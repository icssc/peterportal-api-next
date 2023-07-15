import packageJson from "../../package.json";
import { synthesizeConfig } from "../config.js";

import { getApi } from "./constructs/Api/Api.js";

export async function detectConstruct(directory = process.cwd()) {
  const app = await synthesizeConfig();

  try {
    const api = await getApi(app);

    if (Object.keys(api.routes).includes(directory)) {
      return api;
    }
  } catch {
    console.log("No API construct found");
  }

  throw new Error(`No special construct from ${packageJson.name} found.`);
}
