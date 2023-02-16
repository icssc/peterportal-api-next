const { resolve } = require("path");

module.exports = require("../../webpack.base")(
  resolve(__dirname, "dist"),
  "example-base.cjs"
);
