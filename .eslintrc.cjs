/** @type {import('eslint').Linter.Config} */
const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.json',
      './documentation/tsconfig.json',
      'documentation/cdk/tsconfig.json',
    ],
  },
  plugins: ['react', 'react-hooks', 'import', 'jsx-a11y', '@typescript-eslint/eslint-plugin'],
  extends: [
    'eslint:recommended',
    'plugin:react/jsx-runtime',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'prettier',
  ],
  rules: {
    'import/order': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    node: true,
    es2021: true,
  },
  ignorePatterns: ['*.config.*', '*.cjs'],
}

module.exports = config
