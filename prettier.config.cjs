// @ts-check

/**
 * Prettier plugins only work in VSCode with the `cjs` format.
 * @see {@link https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/113}
 */

/**
 * @type {import('prettier').Config}
 */
const config = {
  printWidth: 100,
  plugins: ["prettier-plugin-packagejson", "prettier-plugin-prisma"],
};

module.exports = config;
