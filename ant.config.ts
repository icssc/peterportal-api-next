import { App, Stack } from "aws-cdk-lib";
import { Api } from "ant-stack/constructs/Api";

const inDir = "./src";
const outDir = "./dist";
const entryFileName = "index";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelPath from 'path';
import topLevelUrl from 'url';
import topLevelModule from 'module';
const require = topLevelModule.createRequire(import.meta.url);
const __filename = topLevelUrl.fileURLToPath(import.meta.url);
const __dirname = topLevelPath.dirname(__filename);
`;

export default async function main() {
  const app = new App();

  class MyStack extends Stack {
    constructor(scope: App, id: string) {
      super(scope, id);

      new Api(this, "Api", {
        directory: "apps/api",
        constructs: {},
        runtime: {
          esbuild: {
            entryPoints: [`${inDir}/${entryFileName}.ts`],
            external: ["@aws-sdk/client-lambda"],
            outdir: outDir,
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

  new MyStack(app, "MyStack");

  return app;
}
