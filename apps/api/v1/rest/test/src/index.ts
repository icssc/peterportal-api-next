import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

const GET: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

export default { GET };
