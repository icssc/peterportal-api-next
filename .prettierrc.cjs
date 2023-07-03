/**
 * `cjs` format is required for plugins to work in VSCode.
 * @see {@link https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/113}
 */

/** @type {import('prettier').Config} */
module.exports = {
  plugins: [
    require.resolve("prettier-plugin-packagejson"),
    require.resolve("prettier-plugin-prisma"),
  ],
  printWidth: 100,
};
