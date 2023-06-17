import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

const GET: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

const POST: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

const PUT: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

const DELETE: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

export default { GET, POST, PUT, DELETE };
