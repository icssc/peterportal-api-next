import { createOKResult, zeroUUID, type InternalHandler } from 'ant-stack'

const GET: InternalHandler = async (event) => {
  return createOKResult({ params: event.params }, zeroUUID)
}

export default { GET }
