import { resolve } from 'node:path'
import { copyFileSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'
import { getConfig, type AntConfig } from '../../config.js'
import {
  createBunHandler,
  createNodeHandler,
  type InternalHandler,
} from '../../lambda-core/internal/handler.js'

/**
 * Compile for an AWS Lambda runtime
 */
async function compileRuntime(config: AntConfig, functionName: string, outputFile: string) {
  const internalHandlers = await import(
    resolve(config.esbuild.outdir ?? '.', config.runtime.entryFile)
  )

  copyFileSync(
    resolve(__dirname, config.runtime.lambdaCoreFile),
    resolve(config.esbuild.outdir ?? '.', config.runtime.lambdaCoreFile)
  )

  const exports = Object.keys(internalHandlers)
    .map(
      (httpMethod) =>
        `export const ${httpMethod} = ${functionName}(${config.runtime.entryHandlersName}.${httpMethod})`
    )
    .join('\n')

  const script = `\
import * as ${config.runtime.entryHandlersName} from './${config.runtime.entryFile}'
import { ${functionName} } from './${config.runtime.lambdaCoreFile}'
${exports}
`

  writeFileSync(resolve(config.esbuild.outdir ?? '.', outputFile), script)
}

/**
 * Builds an {@link InternalHandler}.
 * TODO: add the ability to specify options.
 */
export const buildInternalHandler = async () => {
  const config = await getConfig()

  const buildOutput = await build(config.esbuild)

  if (config.esbuild.logLevel === 'info') {
    console.log(buildOutput)
  }

  await compileRuntime(config, createNodeHandler.name, config.runtime.nodeRuntimeFile)
  await compileRuntime(config, createBunHandler.name, config.runtime.bunRuntimeFile)
}
