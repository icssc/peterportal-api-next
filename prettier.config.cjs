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
  plugins: ["prettier-plugin-packagejson", "prettier-plugin-prisma", "prettier-plugin-sql"],
  overrides: [
    {
      files: "*.sql",
      options: {
        language: "postgresql",
        keywordCase: "upper",
        expressionWidth: 80,
        tabWidth: 2,
      },
    },
  ],
};

module.exports = config;
