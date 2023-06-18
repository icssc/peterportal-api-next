import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import type { Request as ExpressRequest } from 'express'

import { zeroUUID } from '../constants.js'

/**
 * The body of a warming request to an AWS Lambda function.
 */
export const warmerRequestBody = JSON.stringify({ isWarmer: true })

/**
 * Basic request that will be processed by runtime-agnostic handler functions.
 * Additional properties may be available to different runtimes.
 */
export interface InternalRequest<T = unknown> {
  /**
   * The original request object received. This depends on the runtime.
   */
  request: T

  /**
   * Request body.
   */
  body: unknown

  /**
   * Request headers represented as a `Record`.
   */
  headers: Record<string, string>

  /**
   * Request HTTP method.
   */
  method: string

  /**
   * Request path parameter(s).
   */
  params: Record<string, string | undefined> | null

  /**
   * The absolute path of the request.
   */
  path: string

  /**
   * The parsed query string passed in the request.
   */
  query: Record<string, string | string[] | undefined>

  /**
   * The AWS Lambda request ID associated with the request.
   */
  requestId: string

  /**
   * Whether the request is a warmer request.
   */
  isWarmerRequest: boolean
}

/**
 * Internal requests from a local Express development server only have the basic properties.
 */
export type InternalExpressRequest = InternalRequest<ExpressRequest>

/**
 * Internal requests from a live AWS Lambda function also include its original context.
 */
export type InternalNodeRequest = InternalRequest<APIGatewayProxyEvent> & { context: Context }

/**
 * Internal requests from a local Bun HTTP development server only have the basic properties.
 */
export type InternalBunRequest = InternalRequest<BunRequest>

/**
 * Transform an {@link ExpressRequest} into an {@link InternalExpressRequest}.
 */
export function transformExpressRequest(req: ExpressRequest) {
  const internalExpressRequest: InternalExpressRequest = {
    request: req,
    body: req.body,
    headers: normalizeRecord(req.headers),
    method: req.method,
    params: req.params,
    path: req.path,
    query: normalizeRecord(req.query),
    requestId: zeroUUID,
    isWarmerRequest: false,
  }

  return internalExpressRequest
}

/**
 * Transform AWS Lambda event and context into an {@link InternalNodeRequest} from AWS Lambda's Node runtime.
 */
export function transformNodeRequest(event: APIGatewayProxyEvent, context: Context) {
  const internalLambdaRequest: InternalNodeRequest = {
    request: event,
    context,
    body: event.body ? JSON.parse(event.body) : null,
    headers: normalizeRecord(event.headers),
    method: event.httpMethod,
    params: event.pathParameters,
    path: event.path,
    query: normalizeRecord(event.multiValueQueryStringParameters ?? {}),
    requestId: context.awsRequestId,
    isWarmerRequest: event.body === warmerRequestBody,
  }

  return internalLambdaRequest
}

/**
 * A request received from the AWS Lambda Bun runtime.
 * The `aws` property is actually only available when deployed on AWS Lambda.
 */
export type BunRequest = Request & { aws: APIGatewayProxyEvent }

/**
 * Transform received {@link BunRequest} into an {@link InternalBunRequest}.
 */
export function transformBunRequest(request: BunRequest): InternalBunRequest {
  const internalBunRequest: InternalBunRequest = {
    request,
    body: request.body,
    headers: normalizeRecord({}),
    method: request.method,
    params: null,
    path: request.url,
    query: normalizeRecord({}),
    requestId: zeroUUID,
    isWarmerRequest: false,
  }

  return internalBunRequest
}

/**
 * Why are there so many ways to create a stupid looking object!
 */
type StupidRecord = ExpressRequest['query'] | APIGatewayProxyResult['headers']

/**
 * Type guard that asserts the value of an object entry is not null.
 */
function entryValueNotNull<T>(v: [string, T]): v is [string, NonNullable<T>] {
  return v != null
}

/**
 * Given some dumb looking object, return a nicer looking one.
 * FIXME: this seems computationally expensive to be doing on every request. Maybe we should lazily do it?
 */
export function normalizeRecord(headers: StupidRecord = {}): Record<string, string> {
  const headerEntries = Object.entries(headers)
    .filter(entryValueNotNull)
    .map(([k, v]) => [k, Array.isArray(v) ? (v.length === 1 ? v[0] : v) : v])

  return Object.fromEntries(headerEntries)
}
