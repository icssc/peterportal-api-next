import { defineApiSettings } from "ant-stack/constructs/Api";
import { defineConfig } from "ant-stack/config";

const config = defineConfig(
  defineApiSettings("", {} as any),
  defineApiSettings("", {} as any),
  defineApiSettings("", {} as any)
);

export default config;
