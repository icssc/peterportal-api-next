import * as cdk from "aws-cdk-lib";
import { StaticSite } from "./cdk/constructs/StaticSite.js";
import { SsrSite } from "./cdk/constructs/SsrSite.js";

export default function main() {
  const app = new cdk.App();

  new StaticSite(app, "Static Site", { directory: "" });

  new SsrSite(app, "SSR Site", { directory: "" });

  return app;
}
