/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      "./tsconfig.json",
      "./apps/documentation/tsconfig.json",
      "./apps/documentation/cdk/tsconfig.json",
    ],
    sourceType: "module",
  },
  plugins: ["import", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "turbo",
    "prettier"
  ],
  rules: {
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/order": [
      "error",
      {
        "alphabetize": { "order": "asc" },
        "newlines-between": "always",
      }
    ]
  },
  ignorePatterns: ["*.config.*", "*.cjs"],
  env: {
    es2020: true,
    node: true
  },
};

module.exports = config
