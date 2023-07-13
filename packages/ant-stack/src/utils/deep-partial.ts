export type DeepPartial<T> = {
  [K in keyof T]?: K extends Record<PropertyKey, unknown> ? DeepPartial<T[K]> : T[K];
};
