/**
 * The base type for all REST API responses.
 */
export type BaseResponse = {
  /**
   * The timestamp (in CLF format) of the time that the request was processed.
   */
  timestamp: string;
  /**
   * The unique identifier for the request.
   */
  requestId: string;
  /**
   * The status code of the request.
   */
  statusCode: number;
};

/**
 * The type for a successful response from the REST API. You should not use this
 * type directly, since there is no guarantee that the response is successful.
 */
export type Response<T> = BaseResponse & {
  /**
   * The payload returned by the REST API.
   */
  payload: T;

  success: true;
};

/**
 * The type for an erroneous response from the REST API.
 */
export type ErrorResponse = BaseResponse & {
  /**
   * The brief error message.
   */
  error: string;
  /**
   * The detailed error message.
   */
  message: string;

  success: false;
};

/**
 * The type alias for a response returned from the REST API. You should test the value of `success`
 * to determine whether the request was successful.
 *
 * @typeParam T The payload type of the REST API endpoint being queried.
 */
export type RawResponse<T> = Response<T> | ErrorResponse;
