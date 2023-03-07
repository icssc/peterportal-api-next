import { build } from "esbuild";
import { cp, mkdir, rm } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const define = {};

for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

switch (process.env.NODE_ENV) {
  case "development":
    define["process.env.BASE_URL"] = `http://localhost:${
      process.env.API_PORT || 8080
    }`;
    break;
  case "staging":
    define[
      "process.env.BASE_URL"
    ] = `https://${process.env.STAGE}.api-next.peterportal.org`;
    break;
  case "production":
    define["process.env.BASE_URL"] = "https://api-next.peterportal.org";
    break;
}

define["process.env.BASE_URL"] = JSON.stringify(define["process.env.BASE_URL"]);

(async () => {
  const cwd = dirname(fileURLToPath(import.meta.url));
  /** @type {import("esbuild").BuildOptions} */
  const options = {
    bundle: true,
    define,
    entryPoints: [join(cwd, "index.ts")],
    logLevel: "info",
    minify: true,
    outfile: join(cwd, "dist/index.cjs"),
    platform: "node",
    plugins: [
      {
        name: "clean",
        setup(build) {
          build.onStart(async () => {
            await rm(join(cwd, "dist/"), { recursive: true, force: true });
            await mkdir(join(cwd, "dist/"));
          });
        },
      },
      {
        name: "copy",
        setup(build) {
          build.onEnd(async () => {
            await cp(join(cwd, "schema/"), join(cwd, "dist/schema/"), {
              recursive: true,
            });
          });
        },
      },
    ],
    target: "node16",
  };
  await build(options);
})();
