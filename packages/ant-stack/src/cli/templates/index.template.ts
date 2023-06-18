/**
 * Example of what an endpoint entry file should look like.
 */

import { createOKResult, zeroUUID, type InternalHandler } from 'ant-stack'

export const GET: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID)
}

export const POST: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID)
}

export const PUT: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID)
}

export const DELETE: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID)
}

/**
 * `export default` all the handlers in a single object, or export them individually.
 * Doing both is not required.
 */
export default { GET, POST, PUT, DELETE }
