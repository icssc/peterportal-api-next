import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    ...VitePluginNode({
      adapter: "nest",
      appPath: "./index.ts",
      exportName: "viteNodeApp",
    }),
  ],
  optimizeDeps: {
    exclude: [
      "@nestjs/microservices",
      "@nestjs/websockets",
      "cache-manager",
      "class-transformer",
      "class-validator",
      "fastify-swagger",
    ],
  },
});
