import { mkdir, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'
;(async () => {
  const cwd = dirname(fileURLToPath(import.meta.url))
  /** @type {import("esbuild").BuildOptions} */
  const options = {
    bundle: true,
    entryPoints: [join(cwd, 'index.ts')],
    logLevel: 'info',
    minify: true,
    outfile: join(cwd, 'dist/index.cjs'),
    platform: 'node',
    plugins: [
      {
        name: 'clean',
        setup(build) {
          build.onStart(async () => {
            await rm(join(cwd, 'dist/'), { recursive: true, force: true })
            await mkdir(join(cwd, 'dist/'))
          })
        },
      },
    ],
    target: 'node16',
  }
  await build(options)
})()
