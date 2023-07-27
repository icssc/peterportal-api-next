/**
 * `cjs` format is required for plugins to work in VSCode.
 * @see {@link https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/113}
 */

/**
 * @type {import('prettier').Config}
 */
const config = {
  printWidth: 100,
  plugins: ["prettier-plugin-packagejson", "prettier-plugin-prisma"],
  pluginSearchDirs: false,
};

module.exports = config;
