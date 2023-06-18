import chalk from 'chalk'
import { cli, command } from 'cleye'
import { consola } from 'consola'

import { buildInternalHandler } from './commands/build.js'
import { interactiveCreate } from './commands/create'
import { startDevServer } from './commands/dev.js'

async function start() {
  consola.log(chalk('🐜 ant :: the AntStack command-line tool'))

  const argv = cli({
    name: 'ant',

    version: '0.1.0',

    commands: [
      command({
        name: 'create',
      }),

      command({
        name: 'dev',
      }),

      command({
        name: 'build',
      }),
    ],
  })

  switch (argv.command) {
    case 'create': {
      return await interactiveCreate()
    }

    case 'build': {
      return await buildInternalHandler()
    }

    case 'dev': {
      return await startDevServer()
    }
  }
}

start()

export * from './commands/build.js'
export * from './commands/create'
export * from './commands/dev.js'
