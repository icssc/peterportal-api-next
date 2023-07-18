import { defineConfig } from "vitest/config";

const config: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "istanbul",
    },
  },
});

export default config;
