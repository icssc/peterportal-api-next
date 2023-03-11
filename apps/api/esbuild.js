import { bundle } from "@swc/core";
import { build } from "esbuild";

async function aponia() {
  await build({
    bundle: true,
    platform: "node",
    outfile: "out.js",
    entryPoints: ["dist/lambda.js"],
    external: [
      "@nestjs/microservices",
      "@nestjs/websockets",
      "cache-manager",
      "class-transformer",
      "class-validator",
      "fastify-swagger",
    ],
  });
  await bundle({
    target: "node",
    externalModules: [
      "@nestjs/microservices",
      "@nestjs/websockets",
      "cache-manager",
      "class-transformer",
      "class-validator",
      "fastify-swagger",
    ],
    entry: "dist/lambda.cjs",
    output: {
      name: "handler",
      path: "dist",
    },
    module: {},
  });
}

aponia();
