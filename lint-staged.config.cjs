/**
 * @type {import('lint-staged').Config}
 */
const config = {
  "*.?(c|m){js,ts}?(x)": ["eslint --quiet --fix", "prettier --write"],
  "*.{css,graphql,json,md,prisma,sql,yaml,yml}": ["prettier --write"],
};

module.exports = config;
