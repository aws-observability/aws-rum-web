const CopyWebpackPlugin = require("copy-webpack-plugin");
const common = require("./webpack.common");
const { merge } = require("webpack-merge");
const path = require("path");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    loader_npm_rum_tmp: "./src/loader-npm-rum-tmp.ts",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    mainFields: ["main", "module", "browser"],
  },
  output: {
    path: path.join(__dirname, "../build/dev"),
    filename: "[name].js",
    publicPath: "",
  },
  devServer: {
    static: path.join(__dirname, "../build/dev"),
    port: 9000,
    https: false,
    hot: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "app" }],
    }),
  ],
});
