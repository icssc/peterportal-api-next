import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import chalk from 'chalk'
import { consola } from 'consola'
import { getConfig } from '../../config.js'
import { searchForPackageRoot, searchForWorkspaceRoot } from '../../utils/searchRoot.js'

const workspaceRoot = searchForWorkspaceRoot(process.cwd())

const thisProjectRoot = searchForPackageRoot(__dirname)

const templatesPath = join(thisProjectRoot, './src/cli/templates')

/**
 * Interactively create a new API endpoint!
 */
export async function interactiveCreate() {
  const config = await getConfig()

  consola.info(chalk('✨ Creating a new endpoint.'))

  let path = ''

  for (;;) {
    path = await consola.prompt('👉 What is the path to the endpoint?', { type: 'text' })

    if (path.match(/\/[0-9A-Za-z]+/) && !path.endsWith('/')) break

    consola.error(
      chalk.red(
        '❌ Malformed path provided. A well-formed path must consist entirely of path parts (one slash followed by at least one alphanumeric character), and must not end with a slash (e.g. /v1/rest/test).'
      )
    )
  }

  const endpointDirectory = join(workspaceRoot, config.directory, path)
  console.log({ endpointDirectory, workspaceRoot, config, path })

  if (existsSync(endpointDirectory)) {
    consola.warn(`⚠️ A route already exists at ${path}.`)

    const create = await consola.prompt(
      '😨 Would you like to create a new route anyway? This will overwrite the existing route!',
      { type: 'confirm' }
    )

    if (!create) {
      consola.error(chalk.red('Aborting.'))
      return
    }
  }

  const methods = await consola.prompt('⚓ What HTTP methods does it use?', {
    type: 'multiselect',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
  })

  consola.info(`⚙ Creating an endpoint at ${path} with the HTTP methods: ${methods.join(', ')}`)

  const packageJson = createPackageJson({
    name: `api-${path.slice(1).replace(/\//g, '-')}`,
  })

  const entryFile = createEntryFile({ methods })

  mkdirSync(`${endpointDirectory}/src`, { recursive: true })
  writeFileSync(join(endpointDirectory, 'package.json'), packageJson)
  writeFileSync(join(endpointDirectory, 'src/index.ts'), entryFile)

  consola.info(
    `🎉 Endpoint created! Don't forget to run ${chalk.bold(
      `${config.packageManager} install`
    )} to integrate the new route.`
  )
}

interface PackageJsonConfig {
  name: string
}

/**
 * Create the contents for the new endpoint's package.json.
 */
function createPackageJson(config: PackageJsonConfig) {
  const template = readFileSync(`${templatesPath}/package.template.json`, {
    encoding: 'utf-8',
  }).replace('$name', config.name)
  return template
}

interface EntryFileConfig {
  methods: string[]
}

/**
 * @example
 * ```ts
 * const GET: InternalHandler = async (event) => {
 *  return createOKResult({}, zeroUUID);
 * }
 * ```
 */
const createHandlerTemplate = (httpMethod: string) => `\
const ${httpMethod}: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID);
};\
`

/**
 * Create the contents for the new endpoint's entry file.
 */
function createEntryFile(config: EntryFileConfig) {
  const handlerFileLines = [
    'import { createOKResult, zeroUUID, type InternalHandler } from "ant-stack";',
    config.methods.map(createHandlerTemplate).join('\n'),
    `export default { ${config.methods.join(', ')} }`,
  ]
  return handlerFileLines.join('\n\n')
}
