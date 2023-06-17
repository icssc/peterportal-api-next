/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { es2020: true, node: true },
  parserOptions: {
    sourceType: "module",
  },
  plugins: ["import", "simple-import-sort"],
  extends: ["eslint:recommended", "turbo", "prettier"],
  rules: {
    "prefer-const": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      env: { es2020: true, node: true },
      parser: "@typescript-eslint/parser",
      plugins: ["import", "simple-import-sort", "@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "turbo", "prettier"],
      rules: {
        "prefer-const": "error",
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        "import/first": "error",
        "import/newline-after-import": "error",
      },
      settings: {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"],
        },
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: "./tsconfig.json",
          },
        },
      },
    },
  ],
};
