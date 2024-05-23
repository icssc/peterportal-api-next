// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
const config = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    sourceType: "module",
  },
  plugins: ["import", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "prettier",
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
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
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
  ignorePatterns: ["*.cjs"],
  env: {
    es2020: true,
    node: true,
  },
};

module.exports = config;
