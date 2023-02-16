const CopyPlugin = require("copy-webpack-plugin");
const { chmod } = require("fs/promises");
const { resolve } = require("path");

module.exports = (cwd, to) => ({
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: resolve(
            cwd,
            "../../../node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node"
          ),
          to,
        },
        {
          from: resolve(
            cwd,
            "../../../node_modules/.prisma/client/schema.prisma"
          ),
          to,
        },
      ],
    }),
    function () {
      this.hooks.done.tapPromise(
        "Make Prisma query engine executable",
        async () =>
          await chmod(
            resolve(cwd, `${to}/libquery_engine-rhel-openssl-1.0.x.so.node`),
            0o755
          )
      );
    },
  ],
});
