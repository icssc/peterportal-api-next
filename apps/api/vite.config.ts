import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    ...VitePluginNode({
      /**
       * using NestJS
       */
      adapter: "nest",

      /**
       * path to lambda server entrypoint
       */
      appPath: "src/lambda.ts",

      /**
       * named export of the app in the appPath file
       */
      exportName: "handler",

      /**
       * esbuild doesn't work??
       */
      tsCompiler: "swc",
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
