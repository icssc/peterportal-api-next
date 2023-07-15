import child_process from "node:child_process";

const app = `tsx ant.config.ts`;

const cdkCommand = [
  "cdk",
  "deploy",
  "--app",
  app,
  "*",
  "--require-approval",
  "never",
  "--format",
  "json",
  "--outputs-file",
  "outputs.json",
];

async function test() {
  const cdkChild = child_process.spawn("npx", cdkCommand);

  cdkChild.stdout.on("data", (data: Buffer) => console.info(data.toString()));

  cdkChild.stderr.on("data", (data: Buffer) => console.error(data.toString()));

  cdkChild.on("close", async (code, signal) => {
    console.log("code: ", code);
    console.log("signal: ", signal);
  });
}

test();
