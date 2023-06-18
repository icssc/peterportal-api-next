import { createLogger, format, transports } from 'winston'

/**
 * Verbose logger format for development.
 */
const devFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp(),
  format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
)

/**
 * Concise logger format for production.
 */
const prodFormat = format.printf((info) => `[${info.level}] ${info.message}`)

/**
 * The logger used by internal handlers.
 */
export const logger = createLogger({
  level: 'info',
  format: process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports: [new transports.Console()],
  exitOnError: false,
})
