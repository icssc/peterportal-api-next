const days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

/**
 * Input to a transform function.
 */
export type TransformInput = string | string[] | undefined;

/**
 * Output of a transform function.
 */
export type TransformOutput = string[] | undefined;

/**
 * Get unique, sorted array of strings.
 * @param value String of comma-separated values or array of such strings.
 */
export const flattenStringsAndSplit = (value: TransformInput): TransformOutput =>
  value
    ? [
        ...new Set(Array.isArray(value) ? value.flatMap((x) => x.split(",")) : value.split(",")),
      ].sort()
    : undefined;

/**
 * Get unique, sorted array of day strings from input.
 * @param value String of combined days of the week (e.g. ``MWF``) or array of such strings.
 */
export const flattenDayStringsAndSplit = (value: TransformInput): TransformOutput =>
  value
    ? [
        ...new Set(
          Array.isArray(value)
            ? value.flatMap((x) => days.filter((y) => y.includes(x)))
            : days.filter((x) => value.includes(x)),
        ),
      ]
    : undefined;
