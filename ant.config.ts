/**
 * IMPORTANT: we can't import the entirety of aws-cdk-lib because it will nuke our memory when we JIT execute!
 *
 * NOO! 🤬
 * ```ts
 * import * as cdk from 'aws-cdk-lib'
 * ```
 */
import { App, Stack } from "aws-cdk-lib/core";
import { Api } from "ant-stack/constructs/Api";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelModule from 'node:module';
import topLevelPath from 'node:path'
import topLevelUrl from 'node:url'

const require = topLevelModule.createRequire(import.meta.url);
const __filename = topLevelUrl.fileURLToPath(import.meta.url);
const __dirname = topLevelPath.dirname(__filename);
`;

export class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    new Api(this, "Api", {
      directory: "apps/api",
      constructs: {},
      runtime: {
        esbuild: {
          platform: "node",
          format: "esm",
          target: "esnext",
          bundle: true,
          minify: true,
          assetNames: "[name]",
          loader: {
            ".env": "copy",
          },
          banner: { js },
        },
      },
    });
  }
}

export default function main() {
  const app = new App();

  new MyStack(app, "TestingPpaReleaseCandidateStack");

  return app;
}

main();
