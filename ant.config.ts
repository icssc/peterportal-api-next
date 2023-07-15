/**
 * IMPORTANT: we can't import the entirety of aws-cdk-lib because it will nuke our memory when we JIT execute!
 *
 * NOO! 🤬
 * ```ts
 * import * as cdk from 'aws-cdk-lib'
 * ```
 */
import { App, Stack, CfnOutput } from "aws-cdk-lib/core";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Api } from "ant-stack/constructs/Api";

/**
 * @see https://github.com/evanw/esbuild/issues/1921#issuecomment-1491470829
 */
const js = `\
import topLevelModule from 'module';
const require = topLevelModule.createRequire(import.meta.url);
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

class TestStack extends Stack {
  bucket: Bucket;

  constructor(scope: App, id: string) {
    super(scope, id);

    this.bucket = new Bucket(this, "aponia-bucket-test-discipline", {
      versioned: true,
    });

    new CfnOutput(this, "AbCd", {
      value: this.bucket.bucketArn,
    });

    console.log(Stack.of(this).stackName);
  }
}

export default function main() {
  const app = new App();

  new TestStack(app, "MyStack");

  return app;
}

main();
