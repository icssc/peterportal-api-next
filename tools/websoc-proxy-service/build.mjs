import { cp, mkdir, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'

// ESM hack for __dirname
const cwd = dirname(fileURLToPath(import.meta.url))

// The array of packages that ``camaro`` depends on.
// All of these need to be copied into ``dist/node_modules`` after build.
const camaroDeps = [
  '@assemblyscript/loader',
  'base64-js',
  'camaro',
  'eventemitter-asyncresource',
  'hdr-histogram-js',
  'hdr-histogram-percentiles-obj',
  'nice-napi',
  'node-addon-api',
  'node-gyp-build',
  'pako',
  'piscina',
]

async function buildApp() {
  await build({
    bundle: true,
    entryPoints: [join(cwd, 'index.ts')],
    external: ['camaro'],
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
            await mkdir(join(cwd, 'dist/node_modules'))
          })
        },
      },
      {
        name: 'copy',
        setup(build) {
          build.onEnd(async () => {
            await Promise.all(
              camaroDeps.map((module) =>
                cp(
                  join(cwd, `../../node_modules/${module}`),
                  join(cwd, `dist/node_modules/${module}`),
                  { recursive: true }
                )
              )
            )
          })
        },
      },
    ],
    target: 'node16',
  })
}

buildApp()
