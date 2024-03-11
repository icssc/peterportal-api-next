import type { ApiPropsOverride } from "@bronya.js/api-construct";

import { esbuildOptions, constructs } from "../../../../../bronya.config";

export const overrides: ApiPropsOverride = {
  esbuild: esbuildOptions,
  constructs: {
    functionPlugin: constructs.functionPlugin,
    restApiProps: constructs.restApiProps,
  },
};
