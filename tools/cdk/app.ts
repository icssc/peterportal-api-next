#!/usr/bin/env node
import "dotenv/config";

import { App, StackProps } from "aws-cdk-lib";

const app = new App({ autoSynth: true });
const props: StackProps = {
  env: { region: "us-east-1" },
  terminationProtection: /* true */ false,
};
