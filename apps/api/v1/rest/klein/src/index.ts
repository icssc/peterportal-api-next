import { createErrorResult, createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

export const GET: InternalHandler = async (event) => {
  return createOKResult({ hello: "world" }, zeroUUID);
};

export const POST: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

export const PUT: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};

export const DELETE: InternalHandler = async (event) => {
  return createOKResult({}, zeroUUID);
};
