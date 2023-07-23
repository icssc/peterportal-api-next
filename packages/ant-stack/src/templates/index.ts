/**
 * This file is not actually used, but rather an example of a route's entry point.
 */

import { createOKResult, type InternalHandler, zeroUUID } from "ant-stack";

export const GET: InternalHandler = async (request) => {
  return createOKResult(request.body, request.headers, zeroUUID);
};

export const POST: InternalHandler = async (request) => {
  return createOKResult(request.body, request.headers, zeroUUID);
};

export const PUT: InternalHandler = async (request) => {
  return createOKResult(request.body, request.headers, zeroUUID);
};

export const DELETE: InternalHandler = async (request) => {
  return createOKResult(request.body, request.headers, zeroUUID);
};
