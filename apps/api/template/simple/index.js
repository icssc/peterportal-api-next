import nodemon from "nodemon";

nodemon({
  script: "index.ts",
  watch: ["*"],
  exec: "node --experimental-specifier-resolution=node --loader ts-node/esm",
});

nodemon
  .on("start", function () {
    console.log("App has started");
  })
  .on("quit", function () {
    console.log("App has quit");
    process.exit();
  })
  .on("restart", function (files) {
    console.log("App restarted due to: ", files);
  });
