import { createOKResult, zeroUUID, type InternalHandler } from 'ant-stack'

const GET: InternalHandler = async (event) => {
  return createOKResult({ event }, zeroUUID)
}

export default { GET }
