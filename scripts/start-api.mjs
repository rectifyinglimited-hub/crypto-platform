import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const entry = existsSync("backend/server.js")
  ? "backend/server.js"
  : "server.js";

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
