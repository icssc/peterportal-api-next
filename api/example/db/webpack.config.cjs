const { resolve } = require("path");
const { merge } = require("webpack-merge");

module.exports = merge(
  require("../../webpack.base")(
    resolve(__dirname, "dist"),
    "example-db.cjs"
  ),
  require("../../webpack.db")(__dirname, resolve(__dirname, "dist"))
);
