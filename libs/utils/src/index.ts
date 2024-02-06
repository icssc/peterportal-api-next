/**
 * Sleep for the given number of milliseconds.
 * @param duration Duration in ms.
 */
export const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));
