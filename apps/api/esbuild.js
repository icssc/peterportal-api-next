import esbuild from "esbuild";

async function build() {
  await esbuild.build({
    entryPoints: ["src/lambda.ts"],
    bundle: true,
    platform: "node",
    outfile: "dist/lambda.js",
    external: [
      "@nestjs/microservices",
      "@nestjs/websockets",
      "cache-manager",
      "class-transformer",
      "class-validator",
      "fastify-swagger",
    ],
  });
}

build();
