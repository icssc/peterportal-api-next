import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type } from "arktype";
import { config } from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * esbuild will pick up on this and copy the env file to the output folder.
 */
try {
  require("./.env");
} catch { /* noop */ }

config({ path: resolve(__dirname, ".env") });

export const envSchema = type(
  {
    DATABASE_URL: "string",
    DATABASE_URL_SCRAPER: "string",
    NODE_ENV: "string",
  },
  { keys: "distilled" }
);

export const env = envSchema.assert({ ...process.env });

export default env;
