import { defineConfig } from 'tsup'

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

export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true,
  external: ['esbuild'],
  noExternal: [/(.*)/],
  format: ['esm'],
  banner(ctx) {
    return ctx.format === 'esm' ? { js } : undefined
  }
})
