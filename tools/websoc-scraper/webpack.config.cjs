const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: "production",
  target: "node",
  node: false,
  entry: {
    main: "./index.ts",
    parent: "./parent/index.ts",
    child: "./child/index.ts",
  },
  output: {
    path: __dirname + "/dist/",
    filename: "[name]/index.js",
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
};
