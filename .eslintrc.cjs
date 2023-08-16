// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
const config = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./apps/docs/tsconfig.json", "./apps/docs/cdk/tsconfig.json"],
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import", "vitest"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:vitest/recommended",
    "prettier",
    "turbo",
  ],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/order": [
      "error",
      {
        alphabetize: { order: "asc" },
        "newlines-between": "always",
      },
    ],
  },
  ignorePatterns: ["*.config.*", "*.cjs"],
  env: {
    es2020: true,
    node: true,
  },
};

module.exports = config;
