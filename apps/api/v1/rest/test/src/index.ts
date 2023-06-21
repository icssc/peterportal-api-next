import { createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

export const GET: InternalHandler = async (event) => {
  return createOKResult(event.path, zeroUUID);
};

export const POST: InternalHandler = async (event) => {
  return createOKResult(event.path, zeroUUID);
};

export const PUT: InternalHandler = async (event) => {
  return createOKResult(event.path, zeroUUID);
};

export const DELETE: InternalHandler = async (event) => {
  return createOKResult(event.path, zeroUUID);
};
