import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const config: ReturnType<typeof defineConfig> = defineConfig({
  resolve: {
    alias: { "@fixtures": fileURLToPath(new URL("src/fixtures/index.ts", import.meta.url)) },
  },
  test: { globals: true, include: ["src/tests/**/*"], testTimeout: 15000 },
});

export default config;
