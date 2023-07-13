export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<PropertyKey, unknown> ? DeepPartial<T[K]> : T[K];
};
