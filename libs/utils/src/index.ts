/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
export const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

/**
 * Type guard that asserts the input is defined.
 * @param x The input to check.
 */
export const notNull = <T>(x: T): x is NonNullable<T> => x != null;
