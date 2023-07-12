import { Construct } from "constructs";

export interface SsrSiteConfig {
  readonly directory: string;
}

export class SsrSite extends Construct {
  type = "ssr-site" as const;

  constructor(scope: Construct, id: string, readonly config: SsrSiteConfig) {
    super(scope, id);
  }
}
