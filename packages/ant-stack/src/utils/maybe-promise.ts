/**
 * I've seen both maybe-promise and awaitable used to indicate that a value might be async.
 * Just pick the one you like more I guess.
 */

export type MaybePromise<T> = T | PromiseLike<T>;

export type Awaitable<T> = T | PromiseLike<T>;
