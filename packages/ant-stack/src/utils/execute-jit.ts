import path from "node:path";

import createJITI, { type JITIOptions } from "jiti";

const defaultJitiOptions: JITIOptions = {
  interopDefault: true,
  cache: false,
  v8cache: false,
  esmResolve: true,
  requireCache: false,
};

export function executeJit(
  file: string,
  options: JITIOptions = defaultJitiOptions,
  origin = path.resolve()
) {
  const jiti = createJITI(origin, options);
  const executed = jiti(file);
  return executed;
}
