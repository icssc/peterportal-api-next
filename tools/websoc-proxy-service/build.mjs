import { build } from "esbuild";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;

async function buildApp() {
  await build({
    entryPoints: {
      "index": "src/index.ts"
    },
    outdir: "dist",
    bundle: true,
    minify: true,
    format: 'esm',
    platform: "node",
    target: "node16",
    logLevel: "info",
    banner: { js },
  });
}

buildApp();
