import { defineConfig } from "vitest/config";

const config: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    globalSetup: ["src/setup/start-server.ts"],
    setupFiles: ["src/setup/fetch-helpers.ts"],
    include: ["src/tests/**/*"],
    testTimeout: 15000,
  },
});

export default config;
