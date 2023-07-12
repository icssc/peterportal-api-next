/**
 * @param userAgent User agent injected by package manager.
 *        e.g. "pnpm/8.6.2 npm/? node/v18.16.0 linux x64"
 */
export function getPackageManagerInfo(userAgent: string) {
  /**
   * @example ["pnpm/8.6.2", "npm/?", "node/v18.16.0", "linux", "x64"]
   */
  const [packageManagerInfo, _something, _nodeInfo, _os, _osVersion] = userAgent.split(" ");

  /**
   * @example ["pnpm", "8.6.2"]
   */
  const [name, version] = packageManagerInfo.split("/");

  return { name, version };
}

/**
 * Inspired by Vite's strategy to retrieve the package manager.
 * @link https://github.com/vitejs/vite/blob/main/packages/create-vite/src/index.ts#L360
 */
export function getPackageManager() {
  /**
   * Package managers, e.g. npm, yarn, pnpm, inject a user agent into {@link process.env}
   *
   * @example
   * pnpm/8.6.2 npm/? node/v18.16.0 linux x64
   *
   * I have no idea where this is documented...
   * @link https://www.npmjs.com/package/npm-config-user-agent-parser
   */
  const userAgent = process.env.npm_config_user_agent;

  if (!userAgent) {
    return "npm";
  }

  const packageManagerInfo = getPackageManagerInfo(userAgent);

  const packageManager = packageManagerInfo.name ?? "npm";

  return packageManager;
}
