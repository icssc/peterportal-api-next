const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (path, filename) => ({
  mode: "production",
  target: "node",
  node: false,
  entry: "./index.ts",
  output: {
    path,
    filename,
    library: {
      type: "commonjs2",
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [new CleanWebpackPlugin()],
});
