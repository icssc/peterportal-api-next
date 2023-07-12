import { Construct } from "constructs";

export interface StaticSiteConfig {
  readonly directory: string;
}

export class StaticSite extends Construct {
  type = "static-site" as const;

  constructor(scope: Construct, id: string, readonly config: StaticSiteConfig) {
    super(scope, id);
  }
}
