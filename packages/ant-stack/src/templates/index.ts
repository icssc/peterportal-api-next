/**
 * This file is not actually used. But is an example of an entry file.
 */

import { createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

export const GET: InternalHandler = async (event) => {
  return createOKResult(event.body, zeroUUID);
};

export const POST: InternalHandler = async (event) => {
  return createOKResult(event.body, zeroUUID);
};

export const PUT: InternalHandler = async (event) => {
  return createOKResult(event.body, zeroUUID);
};

export const DELETE: InternalHandler = async (event) => {
  return createOKResult(event.body, zeroUUID);
};
