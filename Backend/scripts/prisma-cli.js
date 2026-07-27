require("./load-root-env");

const { execSync } = require("child_process");
const path = require("path");

const args = process.argv.slice(2).join(" ");
execSync(`npx prisma ${args}`, {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  shell: true,
});
